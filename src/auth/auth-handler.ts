import type { SessionData } from "~/auth/types.ts";
import type { InRequest } from "~/serve/in-request.ts";
import type { InResponse } from "~/serve/in-response.ts";
import type { InCloud } from "~/in-cloud.ts";
import type { UserSession } from "./entries/user-session/_user-session.type.ts";
import type { User } from "./entries/user/_user.type.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";

export class AuthHandler {
  #inCloud: InCloud;
  #orm: InSpatialORM | null = null;

  get orm(): InSpatialORM {
    if (!this.#orm) {
      const globalUser = this.#inCloud.orm.systemGobalUser;
      this.#orm = this.#inCloud.orm.withUser(globalUser);
    }
    return this.#orm;
  }

  constructor(inCloud: InCloud) {
    this.#inCloud = inCloud;
  }

  #allowedPaths: Set<RegExp> = new Set();
  #allowedActions: Map<string, Set<string>> = new Map();

  get allowedPaths(): RegExp[] {
    return Array.from(this.#allowedPaths);
  }

  get allowedActions(): Array<{
    group: string;
    actions: string[];
  }> {
    const actions = Array.from(this.#allowedActions.entries()).map(
      ([group, actions]) => ({
        group,
        actions: Array.from(actions),
      }),
    );
    return actions;
  }
  allowPath(match: RegExp): void {
    this.#allowedPaths.add(match);
  }
  allowAction(group: string, action: string): void {
    if (!this.#allowedActions.has(group)) {
      this.#allowedActions.set(group, new Set());
    }
    this.#allowedActions.get(group)?.add(action);
  }

  disallowPath(match: RegExp): void {
    this.#allowedPaths.delete(match);
  }
  disallowAction(group: string, action: string): void {
    if (this.#allowedActions.has(group)) {
      this.#allowedActions.get(group)?.delete(action);
    }
  }
  isPathAllowed(path: string): boolean {
    for (const match of this.#allowedPaths) {
      if (match.test(path)) {
        return true;
      }
    }
    return false;
  }
  isActionAllowed(group: string, action: string): boolean {
    if (this.#allowedActions.has(group)) {
      return this.#allowedActions.get(group)?.has(action) ?? false;
    }
    return false;
  }

  async loadSessionFromToken(
    authToken: string | null | undefined,
  ): Promise<SessionData | null> {
    if (!authToken) {
      return null;
    }
    let sessionData: SessionData | undefined = this.#inCloud.inCache.getValue(
      "authToken",
      authToken,
    );
    if (!sessionData) {
      const user = await this.#inCloud.orm.findEntry<User>("user", [{
        field: "apiToken",
        op: "=",
        value: authToken,
      }]);

      if (user) {
        sessionData = await makeSessiondata(user);

        this.#inCloud.inCache.setValue("authToken", authToken, sessionData);
      }
    }
    return sessionData || null;
  }
  async loadUserSession(
    sessionId: string | null | undefined,
  ): Promise<SessionData | null> {
    if (!sessionId) {
      return null;
    }
    let sessionData = this.#inCloud.inCache.getValue("userSession", sessionId);
    if (!sessionData) {
      const userSession = await this.orm.findEntry<UserSession>(
        "userSession",
        [{
          field: "sessionId",
          op: "=",
          value: sessionId,
        }],
      );
      if (userSession) {
        sessionData = userSession.sessionData as SessionData;
        this.#inCloud.inCache.setValue("userSession", sessionId, sessionData);
      }
    }
    return sessionData
      ? {
        ...sessionData,
        sessionId,
      }
      : null;
  }
  async createUserSession(
    user: User,
    inRequest: InRequest,
    inResponse: InResponse,
  ): Promise<
    SessionData & {
      sessionId: string;
    }
  > {
    const sessionData = await makeSessiondata(user);

    const session = await this.orm.createEntry<UserSession>(
      "userSession",
      {
        user: user.id,
        sessionData,
      },
    );
    // app.cacheSet("userSession", session.id, session.sessionData as any);
    inResponse.setCookie("userSession", session.sessionId);
    inRequest.context.update("user", {
      ...sessionData,
      sessionId: session.sessionId,
    });
    inRequest.context.update("userSession", session.sessionId);
    this.#inCloud.inCache.setValue(
      "userSession",
      session.sessionId,
      {
        ...sessionData,
        sessionId: session.sessionId,
      },
    );
    return {
      ...sessionData,
      sessionId: session.sessionId,
    };
  }
}

async function makeSessiondata(user: User): Promise<SessionData> {
  const accounts = await user.runAction("findAccounts");
  const sessionData: SessionData = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    systemAdmin: user.systemAdmin ?? false,
    accountId: "",
    role: "",
  };
  if (accounts.length > 0) {
    const { accountId, role } = accounts[0];
    sessionData.accountId = accountId;
    sessionData.role = role;
  }
  if (user.systemAdmin) {
    sessionData.role = "systemAdmin";
  }

  return sessionData;
}
