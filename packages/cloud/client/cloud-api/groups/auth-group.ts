import type { ServerCall } from "#client/cloud-api/api-client-types.ts";

export class AuthGroup {
  #call: ServerCall;
  constructor(call: ServerCall) {
    this.#call = call;
  }

  async login(username: string, password: string): Promise<any> {
    return await this.#call<string>("auth", "login", { username, password });
  }

  async logout(): Promise<void> {
    return await this.#call<void>("auth", "logout");
  }

  async authCheck(): Promise<boolean> {
    return await this.#call<boolean>("auth", "authCheck");
  }
}
