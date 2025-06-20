import { raiseServerException } from "/app/server-exception.ts";
import type { EmailAccount } from "../_generated/email-account.ts";
import { EntryType } from "/orm/entry/entry-type.ts";
import { dateUtils } from "/utils/date-utils.ts";

export const emailAccountEntry = new EntryType<EmailAccount>("emailAccount", {
  label: "Email Account",
  description: "An email account that can be used to send and receive emails",
  titleField: "emailAccount",

  fieldGroups: [
    {
      key: "info",
      label: "General Information",
      description: "General information about the email account",
      fields: [
        "emailAccount",
        "senderName",
        "useGmailOauth",
        "sendEmails",
        "receiveEmails",
      ],
    },
    {
      key: "sending",
      label: "Sending",
      description:
        "Settings for sending emails using this account such as SMTP settings",
      fields: [
        "smtpHost",
        "smtpPort",
        "smtpUser",
        "smtpPassword",
      ],
    },
    {
      key: "oauth",
      label: "OAuth",
      fields: [
        "authStatus",
        "accessToken",
      ],
      description: "OAuth settings for Gmail",
      // dependsOn: "useGmailOauth",
    },
  ],
  fields: [
    {
      key: "emailAccount",
      type: "EmailField",
      label: "Email Account",
      description: "The email account to send emails from",

      required: true,
    },
    {
      key: "senderName",
      type: "DataField",
      label: "Sender's Name",
      description: "The name to use when sending emails",
    },
    {
      key: "useGmailOauth",
      type: "BooleanField",
      label: "Use Gmail OAuth",
      description: "Use OAuth to authenticate with Gmail",
    },
    {
      key: "sendEmails",
      type: "BooleanField",
      label: "Send Emails",
      description: "Whether this email account can send emails",
    },
    {
      key: "receiveEmails",
      type: "BooleanField",
      label: "Receive Emails",
      description: "Whether this email account can receive emails",
    },

    {
      key: "smtpHost",
      type: "TextField",
      label: "SMTP Host",
      description: "The host of the SMTP server",
    },
    {
      key: "smtpPort",
      type: "IntField",
      label: "SMTP Port",
      description: "The port of the SMTP server",
    },
    {
      key: "smtpUser",
      type: "DataField",
      label: "SMTP User",
      description: "The user to authenticate with the SMTP server",
    },

    {
      key: "smtpPassword",
      type: "PasswordField",
      label: "SMTP Password",
      description: "The password to authenticate with the SMTP server",
      dependsOn: {
        field: "useGmailOauth",
        value: false,
      },
    },
    {
      key: "authStatus",
      label: "Auth Status",
      type: "ChoicesField",
      defaultValue: "unauthorized",
      readOnly: true,
      choices: [
        {
          key: "unauthorized",
          label: "Unauthorized",
          color: "error",
        },
        {
          key: "authorized",
          label: "Authorized",
          color: "success",
        },
      ],
    },
    {
      key: "accessToken",
      label: "Access Token",
      type: "TextField",
      hidden: true,
      readOnly: true,
    },
    {
      key: "expireTime",
      label: "Expire Time",
      type: "TimeStampField",
      showTime: true,
      readOnly: true,
    },
    {
      key: "acquiredTime",
      label: "Acquired Time",
      type: "TimeStampField",
      showTime: true,
      readOnly: true,
    },
    {
      key: "refreshToken",
      label: "Refresh Token",
      type: "TextField",
      hidden: true,
      readOnly: true,
    },
    {
      key: "tokenType",
      label: "Token Type",
      type: "DataField",
      hidden: false,
      readOnly: true,
    },
  ],
});

emailAccountEntry.addAction({
  key: "authorizeGmail",
  label: "Authorize Gmail",
  params: [],
  description: "Authorize this email account to send emails using Gmail",
  async action({ orm, emailAccount }) {
    const oauthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";

    const emailSettings = await orm.getSettings("emailSettings");
    const redirectHost = emailSettings.redirectHost;
    const clientId = emailSettings.clientId;
    const url = new URL(oauthEndpoint);
    url.searchParams.append("client_id", clientId);
    url.searchParams.append(
      "redirect_uri",
      `${redirectHost}/api?group=email&action=redirect`,
    );
    url.searchParams.append("response_type", "code");
    url.searchParams.append("include_granted_scopes", "true");
    url.searchParams.append("scope", "https://mail.google.com/");
    url.searchParams.append("access_type", "offline");
    url.searchParams.append("prompt", "consent");
    url.searchParams.append("state", emailAccount.id);

    throw new Response(
      "Redirecting to Google OAuth",
      {
        status: 302,
        headers: {
          Location: url.toString(),
        },
      },
    );
  },
});

emailAccountEntry.addAction({
  key: "refreshToken",
  private: true,
  label: "Refresh Token",
  params: [],
  description: "Refresh the access token for this email account",
  async action({ orm, emailAccount }) {
    const emailSettings = await orm.getSettings("emailSettings");

    const refreshToken = emailAccount.refreshToken;
    if (!refreshToken) {
      raiseServerException(
        400,
        "Refresh token is missing",
      );
    }
    const { access_token, expires_in, token_type, refresh_token, scope } =
      await refreshAccessToken({
        clientId: emailSettings.clientId,
        clientSecret: emailSettings.clientSecret,
        refreshToken,
      });
    const acquiredTime = dateUtils.nowTimestamp();
    emailAccount.accessToken = access_token;
    emailAccount.acquiredTime = acquiredTime;
    emailAccount.expireTime = acquiredTime + expires_in * 1000;
    emailAccount.tokenType = token_type;
    if (refresh_token) {
      emailAccount.refreshToken = refresh_token;
    }
    // if (scope) {
    //   emailAccount.scope = scope;
    // }

    emailAccount.authStatus = "authorized";

    await emailAccount.save();
  },
});

export async function refreshAccessToken(creds: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  scope?: string;
}> {
  const { clientId, clientSecret, refreshToken } = creds;
  const url = new URL("https://oauth2.googleapis.com/token");
  const headers = new Headers();
  headers.set("Content-Type", "application/x-www-form-urlencoded");

  const body = new URLSearchParams();
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  body.append("refresh_token", refreshToken);
  body.append("grant_type", "refresh_token");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    raiseServerException(
      response.status,
      "Failed to refresh access token",
    );
  }

  return await response.json();
}

export async function getAccessToken(creds: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<
  {
    access_token: string;
    expires_in: number;
    token_type: string;
    refresh_token?: string;
    scope?: string;
  }
> {
  const { clientId, clientSecret, code } = creds;
  const url = new URL("https://oauth2.googleapis.com/token");
  const headers = new Headers();
  headers.set("Content-Type", "application/x-www-form-urlencoded");

  const body = new URLSearchParams();
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  body.append("code", code);
  body.append("grant_type", "authorization_code");
  body.append(
    "redirect_uri",
    creds.redirectUri,
  );

  const response = await fetch(url.toString(), {
    method: "POST",
    redirect: "manual",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    raiseServerException(
      response.status,
      "Failed to get access token",
    );
  }

  return await response.json();
}
