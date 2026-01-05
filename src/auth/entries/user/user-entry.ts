import { defineEntry } from "~/orm/entry/entry-type.ts";
import { findAccounts } from "./actions/find-accounts.ts";
import { userFields } from "./fields/fields.ts";
import { googleFields } from "./fields/google-fields.ts";
import { setPassword } from "./actions/set-password.ts";
import { validatePassword } from "./actions/validate-password.ts";
import { generateApiToken } from "./actions/generate-api-token.ts";
import { generateResetToken } from "./actions/generate-reset-token.ts";
import { raiseORMException } from "../../../orm/mod.ts";
import { sendWelcomeEmail } from "./actions/send-welcome.ts";

export const userEntry = defineEntry("user", {
  titleField: "fullName",
  systemGlobal: true,
  defaultListFields: [
    "firstName",
    "lastName",
    "email",
    "systemAdmin",
  ],
  description: "A user of the system",
  searchFields: ["email"],
  imageField: "profilePicture",
  fields: [
    ...userFields,
    ...googleFields,
  ],
  fieldGroups: [{
    key: "personal",
    label: "Personal Information",
    description: "Basic information about the user",
    fields: ["profilePicture", "firstName", "lastName", "fullName", "email"],
  }, {
    key: "security",
    label: "Security",
    description: "Security related information",
    fields: ["systemAdmin", "adminPortalAccess", "apiToken", "enabled"],
  }, {
    key: "google",
    label: "Google Account",
    description: "Google account information",
    fields: ["googlePicture", "googleAuthStatus"],
  }],
  actions: [
    setPassword,
    validatePassword,
    generateApiToken,
    generateResetToken,
    findAccounts,
    sendWelcomeEmail,
  ],
});
userEntry.addHook("beforeUpdate", {
  name: "portalAccessForManager",
  handler({ user }) {
    if (user.$systemRole === "accountManager") {
      user.$adminPortalAccess = true;
    }
  },
});
userEntry.addHook("beforeUpdate", {
  name: "setFullName",
  description: "Set the full name of the user",
  handler({
    user,
  }) {
    user.$fullName = `${user.$firstName ?? ""} ${user.$lastName ?? ""}`
      .trim();
  },
});
userEntry.addHook("beforeDelete", {
  name: "deleteUserSessions",
  description: "Delete all user sessions",
  async handler({ orm, user }) {
    await orm.systemDb.deleteRows("entryUserSession", [{
      field: "user",
      op: "=",
      value: user.id,
    }]);
  },
});

userEntry.addHook("beforeDelete", {
  name: "removeFromAccounts",
  description: "Remove the user from all accounts they belong to",
  async handler({ orm, user }) {
    await orm.systemDb.deleteRows("childAccountUsers", [{
      field: "user",
      op: "=",
      value: user.id,
    }]);
  },
});
userEntry.addHook("validate", {
  name: "adminChangesAdmin",
  handler({ user }) {
    if (user.$systemAdmin && user._user?.role !== "systemAdmin") {
      raiseORMException(
        `User ${user.$fullName} can only be modified by a System Administrator`,
      );
    }
  },
});

userEntry.addAction("enable", {
  async action({ user }) {
    user.$enabled = true;
    await user.save();
  },
});
userEntry.addAction("disable", {
  async action({ inCloud, orm, user }) {
    const { rows } = await orm.systemDb.getRows("entryUserSession", {
      columns: ["id", "sessionId"],
      filter: [{
        field: "user",
        op: "=",
        value: user.id,
      }],
      limit: 0,
    });
    for (const { sessionId } of rows) {
      inCloud.inCache.deleteValue("userSession", sessionId);
    }
    await orm.systemDb.deleteRows("entryUserSession", [{
      field: "user",
      op: "=",
      value: user.id,
    }]);
    user.$enabled = false;
    await user.save();
  },
});
