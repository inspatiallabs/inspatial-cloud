// https://mailtrap.io/blog/smtp-commands-and-responses/#SMTP-response-codes

import { raiseServerException } from "~/serve/server-exception.ts";
import type {
  SMTPCapabilities,
  SMTPCommand,
  SMTPOptions,
  State,
} from "./smtpTypes.ts";
import { generateId } from "~/utils/misc.ts";

export class SMTPClient {
  smtpServer: string;
  domain: string;
  port: number;
  userLogin: string;
  // https://developers.google.com/gmail/imap/xoauth2-protocol#smtp_protocol_exchange
  authMethod?: "PLAIN" | "LOGIN" | "XOAUTH2";
  password: string;
  private waitDuration = 10;
  private timeoutDuration = 5000;

  private states: {
    [key in State]: boolean;
  } = {
    notStarted: true,
    connecting: false,
    connected: false,
    tlsChecking: false,
    tlsCapable: false,
    tlsReady: false,
    tlsConnecting: false,
    tlsConnected: false,
    sayingHello: false,
    authReady: false,
    authenticating: false,
    authUsername: false,
    authPassword: false,
    authenticated: false,
    dataReady: false,
    disconnecting: false,
    disconnect: false,
  };

  onStateChange(_state: State, message: string) {
    console.log(message);
  }
  onError = (code: number, message: string) => {
    console.error(`Error ${code}: ${message}`);
  };

  async waitForState(state: State): Promise<boolean> {
    let timeout = 0;

    while (!this.states[state]) {
      await new Promise((resolve) => setTimeout(resolve, this.waitDuration));
      timeout += this.waitDuration;
      if (timeout >= this.timeoutDuration) {
        raiseServerException(
          500,
          `Timeout waiting for ${state} while sending email`,
        );
        return false;
      }
    }
    return true;
  }

  capabilities: SMTPCapabilities = {
    PIPELINING: false,
    STARTTLS: false,
    SMTPUTF8: false,
    AUTH: {
      LOGIN: false,
      PLAIN: false,
      CRAM_MD5: false,
      XOAUTH2: false,
      PLAIN_CLIENTTOKEN: false,
      OAUTHBEARER: false,
      XOAUTH: false,
    },
    "8BITMIME": false,
    ENHANCEDSTATUSCODES: false,
    CHUNKING: false,
    SIZE: 0,
  };

  private connection?: Deno.TcpConn;
  private tlsConnection?: Deno.TlsConn;
  constructor(config: SMTPOptions) {
    this.smtpServer = config.smtpServer;
    this.port = config.port;
    this.userLogin = config.userLogin;
    this.password = config.password;
    this.domain = config.domain;
    this.authMethod = config.authMethod;
  }

  handleChunk(chunk: Uint8Array) {
    const decoder = new TextDecoder();
    const chunkString = decoder.decode(chunk);
    const lines = chunkString.split("\r\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "") {
        continue;
      }
      this.handleLine(lines[i]);
    }
  }

  handleLine(row: string) {
    const code = parseInt(row.substring(0, 3), 10);
    const message = row.substring(4);
    this.onStateChange("connecting", `code: ${code}, message: ${message}`);
    switch (code) {
      case 220:
        this.handle220(message);
        break;
      case 221:
        this.states.disconnect = true;
        break;
      case 235:
        this.handle235(message);
        break;
      case 250:
        this.handle250(message);
        break;
      case 334:
        this.handle334(message);
        break;
      case 354:
        this.states.dataReady = true;
        break;
      case 454:
        this.handle4Error(code, message);
        break;
      case 503:
        this.handle5Error(code, message);
        break;

      default:
        if (code >= 500 && code < 600) {
          this.handle5Error(code, message);
        }
    }
  }

  handle5Error(code: number, message: string) {
    this.onError(code, message);
  }
  handle4Error(code: number, message: string) {
    this.onError(code, message);
  }
  handle235(_message: string) {
    this.states.authenticated = true;
  }
  handle334(message: string) {
    const m = atob(message);
    if (m === "Username:") {
      this.states.authUsername = true;
    }
    if (m === "Password:") {
      this.states.authPassword = true;
    }
  }
  handle220(_message: string) {
    if (!this.states.connected) {
      this.states.connected = true;
      return;
    }
    if (this.states.tlsChecking) {
      this.states.tlsReady = true;
      return;
    }
  }

  handle250(message: string) {
    // if (this.states.sayingHello || this.states.authReady) {
    this.parseHeloRow(message);
    // }
  }
  parseHeloRow(row: string) {
    const words = row.split(" ");
    const firstWord = words[0] as keyof SMTPCapabilities | "Hello";
    if (firstWord === "Hello") {
      return;
    }
    if (words.length > 1) {
      if (words[1] === "Hello") {
        return;
      }
    }
    switch (firstWord) {
      case "STARTTLS":
        this.capabilities.STARTTLS = true;
        this.states.tlsCapable = true;
        break;
      case "AUTH":
        words.slice(1).forEach((auth) => {
          this.capabilities.AUTH[auth as keyof SMTPCapabilities["AUTH"]] = true;
        });
        this.states.authReady = true;
        break;
      case "SIZE":
        this.capabilities.SIZE = parseInt(words[1], 10);
        break;
      default:
        this.capabilities[firstWord] = true;
        break;
    }
  }
  async startTLS() {
    this.states.tlsChecking = true;
    await this.sendCommand("STARTTLS");
  }

  async sayHello() {
    this.states.sayingHello = true;
    await this.sendCommand("EHLO", this.domain);
  }

  async authLogin() {
    this.states.authenticating = true;
    switch (this.authMethod) {
      case "LOGIN": {
        await this.sendCommand("AUTH", "LOGIN");
        await this.waitForState("authUsername");

        const username = btoa(this.userLogin);
        await this.sendCommand(username);
        await this.waitForState("authPassword");
        const password = btoa(this.password);
        await this.sendCommand(password);
        await this.waitForState("authenticated");
        break;
      }
      case "XOAUTH2": {
        const authString =
          `user=${this.userLogin}\u0001auth=Bearer ${this.password}\u0001\u0001`;
        const base64Auth = btoa(authString);
        await this.sendCommand("AUTH", `XOAUTH2 ${base64Auth}`);
        await this.waitForState("authenticated");
        break;
      }
      default:
        raiseServerException(400, "Unsupported auth method");
    }
  }

  async disconnect() {
    this.states.disconnecting = true;
    this.onStateChange("disconnect", "Disconnecting from SMTP Server...");
    await this.sendCommand("QUIT");
    this.onStateChange(
      "disconnect",
      "Waiting for server to close connection...",
    );
    await this.waitForState("disconnect");
    this.onStateChange("disconnect", "Connection closed");
  }
  async connect() {
    this.onStateChange("connecting", "Connecting to SMTP Server...");
    this.states.connecting = true;
    this.connection = await Deno.connect({
      port: this.port,
      hostname: this.smtpServer,
    });
    const write = (chunk: Uint8Array) => {
      this.handleChunk(chunk);
    };
    const reader = this.connection.readable.getReader();
    reader.read().then((result) => {
      result.value && write(result.value);
    });

    const connected = await this.waitForState("connected");
    if (!connected) {
      throw new Error("Connection Timeout");
    }

    this.onStateChange(
      "connected",
      "Connected to SMTP Server, checking capabilities...",
    );
    await this.sayHello();
    let timeout = 0;
    while (!this.states.tlsCapable) {
      if (timeout >= this.timeoutDuration) {
        raiseServerException(
          500,
          "Timeout waiting for server to be TLS Capable",
        );
      }
      const result = await reader.read();
      result.value && write(result.value);

      await new Promise((resolve) => setTimeout(resolve, 100));
      timeout += 100;
    }

    this.onStateChange(
      "tlsCapable",
      "Server is capable of TLS, initiating TLS handshake...",
    );

    await this.startTLS();
    reader.read().then((result) => {
      result.value && write(result.value);
    });
    await this.waitForState("tlsReady");
    this.states.tlsConnecting = true;
    this.tlsConnection = await Deno.startTls(this.connection, {
      hostname: this.smtpServer,
    });
    this.connection = undefined;

    this.tlsConnection.readable.pipeTo(
      new WritableStream({
        write,
      }),
    ).catch((error) => {
      if (error.name === "UnexpectedEof" && this.states.disconnecting) {
        return;
      }
      this.onError(500, error.message);
    });

    this.states.tlsConnected = true;
    this.onStateChange(
      "tlsConnected",
      "TLS Connection established, initiating authentication...",
    );
    await this.sayHello();

    await this.waitForState("authReady");
    await this.authLogin();
    this.onStateChange(
      "authenticated",
      "Authenticated with SMTP Server 🎉. Ready to send some emails!",
    );
  }

  async sendCommand(command: SMTPCommand | string, data?: string) {
    const connection = this.tlsConnection || this.connection;
    if (!connection) {
      throw new Error("Connection is not established");
    }
    const encoder = new TextEncoder();
    let commandString = command;
    if (data) {
      commandString = `${command} ${data}`;
    }
    commandString += "\r\n";

    await connection.write(encoder.encode(commandString));
  }
  async sendEmail(options: {
    header: SMTPHeader;
    body: string;
    attachments?: Array<
      { fileName: string; contentType: string; content: string }
    >;
  }) {
    let body = options.body;
    const bodyType = options.header.contentType;
    if (options.attachments) {
      options.header.contentType = "multipart";
    }
    const header = new MailHeader(options.header);
    if (options.attachments) {
      header.contentType = "multipart";
      const boundaryString = `--${header.boundary}`;
      const attachments = options.attachments.map((attachment) =>
        makeAttachment(
          attachment.fileName,
          attachment.content,
        )
      );
      const newBody: string[] = [
        boundaryString,
        `Content-Type: text/${
          bodyType === "text" ? "plain" : bodyType
        }; charset=utf-8`,
        "",
        options.body,
        "",
      ];

      for (const attachment of attachments) {
        newBody.push(boundaryString);
        newBody.push(attachment);
      }
      newBody.push(`${boundaryString}--`);

      body = newBody.join("\r\n");
    }
    await this.connect();
    await this.sendCommand("MAIL", `FROM:<${header.from.email}>`);
    for (const email of header.to) {
      await this.sendCommand("RCPT", `TO:<${email}>`);
    }
    await this.sendCommand("DATA");
    const ready = await this.waitForState("dataReady");
    if (!ready) {
      raiseServerException(
        500,
        "There was an issue sending the email",
      );
    }
    const headerString = header.getHeader();
    this.onStateChange("dataReady", headerString);
    await this.sendCommand(headerString);
    await this.sendCommand(body);
    await this.sendCommand(".");
    await this.disconnect();
  }
}

function makeAttachment(fileName: string, content: string) {
  const mimeType = getMimeType(fileName);
  return [
    `Content-Type: ${mimeType};`,
    "Content-Transfer-Encoding: 7bit",
    `Content-Disposition: attachment; filename="${fileName}"`,
    "",
    content,
    "",
  ].join("\r\n");
}
interface SMTPHeader {
  from: {
    name?: string;
    email: string;
  };
  /** An array of emails */
  to: string[];
  date?: Date;
  subject: string;
  contentType: "text" | "html" | "multipart";
}

class MailHeader implements SMTPHeader {
  from: SMTPHeader["from"];
  to: SMTPHeader["to"];
  subject: string;
  date: Date;
  contentType: SMTPHeader["contentType"];

  boundary?: string;

  constructor(header: Partial<SMTPHeader>) {
    this.from = {
      name: header.from?.name || "",
      email: header.from?.email || "",
    };
    if (!header.to) {
      raiseServerException(
        400,
        "Email must have a recipient",
      );
    }
    this.to = header.to;
    this.subject = header.subject || "";
    this.contentType = header.contentType || "text";
    this.date = header.date || new Date();
    if (this.contentType === "multipart") {
      this.boundary = generateId(24);
    }
  }

  getHeaderPart(attribute: keyof SMTPHeader) {
    switch (attribute) {
      case "from": {
        let from = "From: ";
        if (this.from.name) {
          from += `${this.from.name} `;
        }
        from += `<${this.from.email}>`;
        return from;
      }
      case "to": {
        let to = "To: ";
        to += this.to.join(", ");
        return to;
      }
      case "subject":
        return `Subject: ${this.subject}`;
      case "contentType":
        if (this.contentType === "multipart") {
          return `Content-Type: multipart/mixed; boundary="${this.boundary}"`;
        }
        return `Content-Type: text/${
          this.contentType === "text" ? "plain" : this.contentType
        }; charset=utf-8`;
      case "date":
        return `Date: ${this.date.toUTCString()}`;
    }
  }
  getHeader() {
    const header = [
      this.getHeaderPart("from"),
      this.getHeaderPart("to"),
      this.getHeaderPart("subject"),
      this.getHeaderPart("date"),
      this.getHeaderPart("contentType"),
    ].join("\r\n");
    return `${header}\r\n\r\n`;
  }
}
const mimTypeMap = new Map<string, string>(Object.entries({
  csv: "text/csv",
  html: "text/html",
  txt: "text/plain",
  pdf: "application/pdf",
  json: "application/json",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
}));

function getMimeType(fileName: string) {
  const extension = fileName.split(".").pop();
  if (!extension) {
    return "text/plain";
  }
  return mimTypeMap.get(extension) || "text/plain";
}
