export type State =
  | "notStarted"
  | "connecting"
  | "connected"
  | "tlsChecking"
  | "tlsCapable"
  | "tlsReady"
  | "tlsConnecting"
  | "tlsConnected"
  | "sayingHello"
  | "authReady"
  | "authenticating"
  | "authUsername"
  | "authPassword"
  | "authenticated"
  | "dataReady"
  | "disconnecting"
  | "disconnect";

export interface SMTPCapabilities {
  PIPELINING: boolean;
  STARTTLS: boolean;
  SMTPUTF8: boolean;
  AUTH: {
    LOGIN: boolean;
    PLAIN: boolean;
    CRAM_MD5: boolean;
    XOAUTH2: boolean;
    PLAIN_CLIENTTOKEN: boolean;
    OAUTHBEARER: boolean;
    XOAUTH: boolean;
  };
  "8BITMIME": boolean;
  ENHANCEDSTATUSCODES: boolean;
  CHUNKING: boolean;
  SIZE: number;
}

export interface SMTPHeader {
  from: string;
  to: string;
  subject: string;
}

export type SMTPCommand =
  | "HELO"
  | "EHLO"
  | "MAIL"
  | "RCPT"
  | "DATA"
  | "QUIT"
  | "AUTH"
  | "STARTTLS";

export interface SMTPOptions {
  smtpServer: string;
  port: number;
  userLogin: string;
  password: string;

  authMethod?: "PLAIN" | "LOGIN" | "XOAUTH2";

  domain: string;
}
