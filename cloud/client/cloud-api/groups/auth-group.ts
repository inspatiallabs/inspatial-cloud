import type { ServerCall } from "#client/cloud-api/api-client-types.ts";
import type { SessionData } from "#client/client-types.ts";

export class AuthGroup {
  #call: ServerCall;

  constructor(call: ServerCall) {
    this.#call = call;
  }

  async login(email: string, password: string): Promise<SessionData> {
    return await this.#call<SessionData>("auth", "login", { email, password });
  }

  async logout(): Promise<void> {
    return await this.#call<void>("auth", "logout");
  }

  async authCheck(): Promise<SessionData | false> {
    const response = await this.#call<SessionData>("auth", "authCheck");
    if (Object.keys(response).length === 0) {
      return false;
    }
    return response;
  }

  async signInWithGoogle(options?: {
    redirectTo?: string;
    csrfToken?: string;
  }): Promise<any> {
    const { redirectTo, csrfToken } = options || {};
    const redirect = redirectTo || globalThis.location.href;
    const csrf = csrfToken || localStorage.getItem("csrfToken");
    if (csrf) {
      localStorage.setItem("csrfToken", csrf);
    }

    const response = await this.#call<{ redirect: string }>(
      "auth",
      "signInWithGoogle",
      {
        redirectTo: redirect,
        csrfToken: csrf,
      },
    );
    if (response.redirect) {
      globalThis.location.href = response.redirect;
    }
  }
}
