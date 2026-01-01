import { ChildEntryType, raiseCloudException } from "@inspatial/cloud";
import { raiseORMException } from "../../../orm/mod.ts";
import { defineEntry } from "../../../orm/entry/entry-type.ts";

export const account = defineEntry("account", {
  label: "Account",
  systemGlobal: true,
  titleField: "name",
  description: "An account in the system with one or more associated users",
  imageField: "profilePicture",
  fieldGroups: [{
    key: "accountInfo",
    label: "Account Info",
    fields: ["profilePicture", "name", "owner"],
  }, {
    key: "status",
    label: "Status",
    fields: ["initialized", "onboardingComplete"],
  }, {
    key: "branding",
    label: "Branding",
    fields: ["logo", "favicon"],
  }, {
    key: "advanced",
    label: "Advanced",
    fields: ["obResponse"],
  }],
  fields: [{
    key: "owner",
    type: "ConnectionField",
    entryType: "user",
    label: "Account Owner",
    description:
      "The user who owns this account. Only one user can be the owner.",
    readOnly: true,
  }, {
    key: "name",
    type: "DataField",
    label: "Account Name",
    description: "The name of the account",
    required: true,
  }, {
    key: "onboardingComplete",
    type: "BooleanField",
    readOnly: false,
  }, {
    key: "initialized",
    type: "BooleanField",
    readOnly: false,
  }, {
    key: "profilePicture",
    type: "ImageField",
    allowedImageTypes: ["png", "jpeg", "jpg", "svg", "webp"],
    optimize: {
      height: 1000,
      width: 1000,
    },
  }, {
    key: "logo",
    type: "ImageField",
    publicFile: true,
    label: "Logo",
    allowedImageTypes: ["png", "jpeg", "jpg", "svg", "webp"],
  }, {
    key: "favicon",
    type: "ImageField",
    label: "Favicon",
    publicFile: true,
    allowedImageTypes: ["png", "ico", "svg"],
  }, {
    key: "obResponse",
    label: "Onboarding Response",
    type: "JSONField",
  }],
});

account.addChild("users", {
  label: "Users",
  fields: [{
    key: "user",
    label: "User",
    type: "ConnectionField",
    entryType: "user",
    required: true,
  }, {
    key: "email",
    type: "EmailField",
    readOnly: true,
    fetchField: {
      connectionField: "user",
      fetchField: "email",
    },
  }, {
    key: "profilePicture",
    type: "DataField",
    readOnly: true,
    fetchField: {
      connectionField: "user",
      fetchField: "profilePicture",
    },
  }, {
    key: "role",
    label: "Role",
    type: "ConnectionField",
    entryType: "userRole",
    fetchField: {
      connectionField: "user",
      fetchField: "systemRole",
      onlyWhenValue: true,
    },
  }, {
    key: "isOwner",
    label: "Is Owner",
    type: "BooleanField",
    defaultValue: false,
  }, {
    key: "systemAdmin",
    type: "BooleanField",
    readOnly: true,
    fetchField: {
      connectionField: "user",
      fetchField: "systemAdmin",
    },
  }],
  description: "Users associated with this account",
});

account.addHook("validate", {
  name: "validateAccountOwner",
  handler({
    account,
  }) {
    let ownerCount = 0;
    const users = account.getChild("users");
    const setOwner = (user: Map<string, any>) => {
      const isOwner = user.get("isOwner");
      if (isOwner) {
        const owner = user.get("user");
        if (owner) {
          account.$owner = owner;
        }
        if (!account.$name) {
          account.$name = user.get("user__title") || account.id;
        }
        ownerCount++;
      }
    };
    for (const user of users._data.values()) {
      setOwner(user._data);
    }
    for (const user of users._newData.values()) {
      setOwner(user._data);
    }
    if (ownerCount > 1) {
      raiseCloudException("Only one user can be the account owner.");
    }
  },
});
account.addHook("validate", {
  name: "noDuplicateUsers",
  handler({ account }) {
    const userIds = new Set<string>();
    for (const { user, user__title } of account.$users.data) {
      if (!user) continue; // Skip if user is not set
      if (userIds.has(user)) {
        raiseORMException(
          `User with ID ${user} is already associated with this account.`,
          `Duplicate user: ${user__title || user}`,
          400,
        );
      }
      userIds.add(user);
    }
  },
});
account.addAction("queueInitialize", {
  label: "Schedule Account Initialization",
  private: false,
  async action({ account }) {
    if (account.$initialized) return;
    await account.enqueueAction("initialize");
  },
});
account.addAction("initialize", {
  label: "Initialize Account",
  private: true,
  async action({ account, inCloud }) {
    if (account.$initialized) return;
    const schemaId = account.$id;
    await inCloud.orm.db.createSchema(schemaId);
    await inCloud.orm.migrate(schemaId);
    account.$initialized = true;
    await account.save();
  },
});
account.addHook("afterCreate", {
  name: "initializeAccount",
  async handler({ account, inCloud }) {
    if (account.$initialized) return;
    await account.enqueueAction("initialize");
  },
});
account.addAction("addUser", {
  description: "Add a user to the account",
  // label: "Add User",
  params: [{
    key: "firstName",
    type: "DataField",
    required: true,
  }, {
    key: "lastName",
    type: "DataField",
    required: true,
  }, {
    key: "email",
    type: "DataField",
    required: true,
  }, {
    key: "role",
    label: "Role",
    type: "ConnectionField",
    entryType: "userRole",
    required: true,
  }],

  async action({ account, params, orm }) {
    const { firstName, lastName, email } = params;
    const role = params.role as any;
    let user = await orm.findEntry("user", {
      email,
    });
    if (!user) {
      user = await orm.createEntry("user", {
        firstName,
        lastName,
        email,
      });
    }
    account.$users.add({
      user: user.$id,
      isOwner: false,
      role: role,
      systemAdmin: false,
    });
    await account.save();
  },
});
