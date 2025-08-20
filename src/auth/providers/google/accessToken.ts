import { raiseServerException } from "~/serve/server-exception.ts";
import convertString from "~/utils/convert-string.ts";
import { getInLog } from "#inLog";

export class GoogleOAuth {
  #baseUrl: string = "https://oauth2.googleapis.com";
  clientId: string;
  clientSecret: string;

  constructor(config: {
    clientId: string;
    clientSecret: string;
  }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }
  async getAccessToken(options: {
    code: string;
    redirectUri: string;
  }): Promise<GoogleAccessTokenResponse | null> {
    const url = new URL("/token", this.#baseUrl);
    const headers = new Headers();
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    const body = new URLSearchParams();
    body.append("client_id", this.clientId);
    body.append("client_secret", this.clientSecret);
    body.append("code", options.code);
    body.append("grant_type", "authorization_code");
    body.append("redirect_uri", options.redirectUri);
    const result = await fetch(url.toString(), {
      method: "POST",
      redirect: "manual",
      headers,
      body: body.toString(),
    });
    if (!result.ok) {
      getInLog("cloud").error(
        `Failed to get access token: ${result.status} ${result.statusText}`,
      );
      raiseServerException(
        400,
        "Google auth: Failed to get access token",
      );
    }
    const data = await result.json();
    const dataMap = new Map<string, any>();
    const expectedKeys = ["accessToken", "expiresIn", "tokenType"];
    const _optionalKeys = ["refresh_token", "scope", "id_token"];

    Object.entries(data).forEach(([key, value]) => {
      dataMap.set(convertString(key, "camel"), value);
    });
    for (const key of expectedKeys) {
      if (!dataMap.has(key)) {
        getInLog("cloud").error(
          `Failed to get access token: ${key} not found in response`,
        );
        raiseServerException(
          400,
          `Google auth: Failed to get access token: ${key} not found in response`,
        );
      }
    }
    if (dataMap.has("idToken")) {
      const idToken = dataMap.get("idToken");
      const parsedIdToken = this.#parseIdToken(idToken);
      dataMap.set("idToken", parsedIdToken);
    }

    return Object.fromEntries(dataMap) as GoogleAccessTokenResponse;
  }
  #parseIdToken(token: string) {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64).split("").map((c) => {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(""),
    );
    const data = JSON.parse(jsonPayload);
    const responseData: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
      responseData[convertString(key, "camel")] = value;
    });
    return responseData as GoogleIdToken;
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<GoogleAccessTokenResponse | null> {
    const url = new URL("/token", this.#baseUrl);
    const headers = new Headers();
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    const body = new URLSearchParams();
    body.append("client_id", this.clientId);
    body.append("client_secret", this.clientSecret);
    body.append("refresh_token", refreshToken);
    body.append("grant_type", "refresh_token");
    const result = await fetch(url.toString(), {
      method: "POST",
      redirect: "manual",
      headers,
      body: body.toString(),
    });
    if (!result.ok) {
      getInLog("cloud").error(
        `Failed to refresh access token: ${result.status} ${result.statusText}`,
      );
      raiseServerException(
        400,
        "Google auth: Failed to refresh access token",
      );
    }
    const data = await result.json();
    return data as GoogleAccessTokenResponse;
  }
  async getUserInfo(
    accessToken: string,
  ): Promise<GoogleUserInfo | void> {
    const url = new URL(
      "https://www.googleapis.com/oauth2/v3/userinfo",
    );
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${accessToken}`);
    const result = await fetch(url.toString(), {
      method: "GET",
      headers,
    });
    if (!result.ok) {
      getInLog("cloud").error(
        `Failed to get user info: ${result.status} ${result.statusText}`,
      );
      raiseServerException(
        400,
        "Google auth: Failed to get user info",
      );
    }
    const data = await result.json();
    const dataMap = new Map<string, any>();
    Object.entries(data).forEach(([key, value]) => {
      dataMap.set(convertString(key, "camel"), value);
    });

    return Object.fromEntries(dataMap) as GoogleUserInfo;
  }
}

export interface GoogleAccessTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  refreshToken?: string;
  scope?: string;
  idToken?: GoogleIdToken;
}

export interface GoogleIdToken {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  hd?: string;
  email: string;
  emailVerified: boolean;
  atHash?: string;
  nonce: string;
  name: string;
  picture: string;
  givenName: string;
  familyName: string;
  iat: number;
  exp: number;
}

export interface GoogleUserInfo {
  familyName: string;
  name: string;
  picture: string;
  email: string;
  givenName: string;
  id: string;
  emailVerified: boolean;
}
