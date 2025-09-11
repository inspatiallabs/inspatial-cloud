import { raiseServerException } from "~/serve/server-exception.ts";
import { EntryType } from "~/orm/entry/entry-type.ts";
import { dateUtils } from "~/utils/date-utils.ts";
import { GoogleOAuth } from "../../auth/providers/google/accessToken.ts";

export const emailAccountEntry = new EntryType(
  "emailAccount",
  {
    label: "Email Account",
    description: "An email account that can be used to send and receive emails",
    systemGlobal: true,
    titleField: "emailAccount",
    defaultListFields: ["senderName", "useGmailOauth", "authStatus"],
    fieldGroups: [
      {
        key: "info",
        label: "General Information",
        description: "General information about the email account",
        fields: [
          "emailAccount",
          "senderName",
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
          "useGmailOauth",
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
          "authUrl",
          "authStatus",
          "accessToken",
          "tokenType",
          "expireTime",
          "acquiredTime",
        ],
        description: "OAuth settings for Gmail",
      },
    ],
    fields: [{
      key: "emailAccount",
      type: "EmailField",
      label: "Email Account",
      description: "The email account to send emails from",

      required: true,
    }, {
      key: "senderName",
      type: "DataField",
      label: "Sender's Name",
      description: "The name to use when sending emails",
    }, {
      key: "useGmailOauth",
      type: "BooleanField",
      label: "Use Gmail OAuth",
      description: "Use OAuth to authenticate with Gmail",
    }, {
      key: "authUrl",
      type: "URLField",
      label: "Authorize Gmail",
      description: "The URL to authorize this email account with Gmail",
      readOnly: true,
      urlType: "button",
    }, {
      key: "sendEmails",
      type: "BooleanField",
      label: "Send Emails",
      description: "Whether this email account can send emails",
      hidden: true,
    }, {
      key: "receiveEmails",
      type: "BooleanField",
      label: "Receive Emails",
      description: "Whether this email account can receive emails",
      hidden: true,
    }, {
      key: "smtpHost",
      type: "TextField",
      label: "SMTP Host",
      description: "The host of the SMTP server. smtp.gmail.com for Gmail",
    }, {
      key: "smtpPort",
      type: "IntField",
      label: "SMTP Port",
      description: "The port of the SMTP server. 587 for Gmail",
    }, {
      key: "smtpUser",
      type: "DataField",
      label: "SMTP User",
      description:
        "The user to authenticate with the SMTP server. This is usually the email address",
    }, {
      key: "smtpPassword",
      type: "PasswordField",
      label: "SMTP Password",
      description:
        "The password to authenticate with the SMTP server. Not required if using Gmail OAuth",
      dependsOn: {
        field: "useGmailOauth",
        value: false,
      },
    }, {
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
    }, {
      key: "accessToken",
      label: "Access Token",
      type: "TextField",
      hidden: false,
      readOnly: true,
    }, {
      key: "expireTime",
      label: "Expire Time",
      type: "TimeStampField",
      showTime: true,
      hidden: false,
      readOnly: true,
    }, {
      key: "acquiredTime",
      label: "Acquired Time",
      type: "TimeStampField",
      showTime: true,
      hidden: false,
      readOnly: true,
    }, {
      key: "refreshToken",
      label: "Refresh Token",
      type: "TextField",
      hidden: false,
      readOnly: true,
    }, {
      key: "tokenType",
      label: "Token Type",
      type: "DataField",
      hidden: false,
      readOnly: true,
    }],
    hooks: {
      beforeUpdate: [{
        name: "setGoogleAuthDefaults",
        description: "Set default values for Google OAuth fields",
        handler({ emailAccount }) {
          if (!emailAccount.$useGmailOauth) {
            return;
          }
          if (!emailAccount.$smtpHost) {
            emailAccount.$smtpHost = "smtp.gmail.com";
          }
          if (!emailAccount.$smtpPort) {
            emailAccount.$smtpPort = 587;
          }
          if (!emailAccount.$smtpUser) {
            emailAccount.$smtpUser = emailAccount.$emailAccount;
          }
        },
      }, {
        name: "generateAuthUrl",
        description: "Generate the authorization URL for Gmail OAuth",
        async handler({ orm, emailAccount }) {
          if (!emailAccount.$useGmailOauth) {
            return;
          }
          const oauthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
          const authSettings = await orm.getSettings(
            "authSettings",
          );

          if (!authSettings.$googleClientId) {
            raiseServerException(
              400,
              "Google auth: Client ID not set in settings",
            );
          }
          const url = new URL(oauthEndpoint);
          url.searchParams.append("client_id", authSettings.$googleClientId);
          url.searchParams.append(
            "redirect_uri",
            `${authSettings.$hostname}/api?group=email&action=redirect`,
          );
          url.searchParams.append("response_type", "code");
          url.searchParams.append("include_granted_scopes", "true");
          url.searchParams.append("scope", "https://mail.google.com/");
          url.searchParams.append("access_type", "offline");
          url.searchParams.append("prompt", "consent");
          url.searchParams.append("state", emailAccount.$id);
          emailAccount.$authUrl = url.toString();
        },
      }],
    },
  },
);

emailAccountEntry.addAction("refreshToken", {
  private: true,
  label: "Refresh Token",
  description: "Refresh the access token for this email account",
  async action({ orm, emailAccount }) {
    const { $googleClientId, $googleClientSecret } = await orm.getSettings(
      "authSettings",
    );
    if (!$googleClientId || !$googleClientSecret) {
      raiseServerException(
        400,
        "Google auth: Client ID or Client Secret not set in settings",
      );
    }

    const googleAuth = new GoogleOAuth({
      clientId: $googleClientId,
      clientSecret: $googleClientSecret,
    });
    if (!emailAccount.$refreshToken) {
      raiseServerException(
        400,
        "Refresh token is missing",
      );
    }

    const response = await googleAuth.refreshAccessToken(
      emailAccount.$refreshToken,
    );
    if (response === null) {
      raiseServerException(
        400,
        "Failed to refresh access token",
      );
    }
    const { accessToken, refreshToken, expiresIn, tokenType } = response;
    const acquiredTime = dateUtils.nowTimestamp();
    emailAccount.$accessToken = accessToken;
    emailAccount.$acquiredTime = acquiredTime;
    emailAccount.$expireTime = acquiredTime + expiresIn * 1000;
    emailAccount.$tokenType = tokenType;
    if (refreshToken) {
      emailAccount.$refreshToken = refreshToken;
    }
    // if (scope) {
    //   emailAccount.scope = scope;
    // }

    emailAccount.$authStatus = "authorized";

    await emailAccount.save();
  },
});
