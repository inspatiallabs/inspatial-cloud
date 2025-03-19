import { createAction } from "#/actions/createAction.ts";
import { raiseEasyException } from "#/easyException.ts";

import type { EasyApp } from "#/app/easyApp.ts";
import type { EasyResponse } from "#/app/easyResponse.ts";
import type { Entry } from "#orm/entry/entry/entryType/entry.ts";

export const loginAction = createAction("login", {
  description: "Login user",
  public: true,
  async action(app, { email, password }, request, response) {
    const user = await app.orm.findEntry("user", {
      email: email,
    });
    if (!user) {
      raiseEasyException("unauthorized", 401);
    }
    const isValid = await user.runAction<boolean>("validatePassword", {
      password,
    });
    if (!isValid) {
      raiseEasyException("unauthorized", 401);
    }

    return await createUserSession(app, user, response);
  },
  params: {
    email: {
      type: "EmailField",
      required: true,
    },
    password: {
      type: "PasswordField",
      required: true,
    },
  },
});

async function createUserSession(
  app: EasyApp,
  user: Entry,
  response: EasyResponse,
) {
  const sessionData = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    systemAdmin: user.systemAdmin,
  };
  const session = await app.orm.createEntry("userSession", {
    user: user.id,
    sessionData,
  });
  app.cacheSet("userSession", session.id, session.sessionData as any);
  response.setCookie("userSession", session.id);
  return session.sessionData;
}
