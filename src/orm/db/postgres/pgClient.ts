//https://www.postgresql.org/docs/16/protocol-flow.html
//https://www.postgresql.org/docs/16/protocol-message-formats.html

import { errorCodeMap, pgErrorMap } from "~/orm/db/postgres/maps/errorMap.ts";
import { PgError } from "~/orm/db/postgres/pgError.ts";
import {
  type ColumnDescription,
  type PgClientConfig,
  QR_TYPE,
  type QueryResponse,
  type ServerStatus,
  type SimpleQueryResponse,
} from "~/orm/db/postgres/pgTypes.ts";
import { MessageWriter } from "~/orm/db/postgres/messageWriter.ts";
import { MessageReader } from "~/orm/db/postgres/messageReader.ts";
import {
  convertToDataType,
  getDataType,
  statusMap,
} from "~/orm/db/postgres/maps/maps.ts";
import { AUTH } from "~/orm/db/postgres/pgAuth.ts";
import { ScramClient } from "~/orm/db/postgres/scram.ts";
import { convertString } from "~/utils/mod.ts";
import { InPgConn } from "./in-pg/in-pg-conn.ts";
import { getInLog } from "#inLog";

export class PostgresClient {
  conn!: Deno.Conn;
  devMode: boolean = false;
  readonly connectionParams: PgClientConfig;
  cancelInfo: {
    pid: number;
    secret: number;
  };
  private readonly serverParams: Record<string, string>;

  private readonly writer: MessageWriter;
  reader!: MessageReader;
  private decoder: TextDecoder = new TextDecoder();
  serverStatus: ServerStatus;
  status: "connected" | "notConnected" = "notConnected";

  get connected(): boolean {
    return this.status === "connected";
  }

  constructor(options: PgClientConfig) {
    if (!options.options) {
      options.options = {};
    }
    if (!options.options.client_encoding) {
      options.options.client_encoding = "UTF8";
    }
    this.connectionParams = options;
    this.devMode = options.connectionType === "dev";

    this.writer = new MessageWriter();
    this.serverParams = {};
    this.serverStatus = "notConnected";
    this.cancelInfo = {
      pid: 0,
      secret: 0,
    };
  }
  private decode(data: Uint8Array): string {
    const chunkSize = 512;
    let offset = 0;
    let message = "";
    while (offset < data.length) {
      const chunk = data.subarray(offset, offset + chunkSize);

      message += this.decoder.decode(chunk, {
        stream: true,
      });
      offset += chunkSize;
    }
    return message;
  }
  async write(data: Uint8Array<ArrayBufferLike>): Promise<void> {
    let totalBytesWritten = 0;
    while (totalBytesWritten < data.length) {
      const bytesWritten = await this.conn.write(
        data.subarray(totalBytesWritten),
      );
      if (bytesWritten === 0) {
        throw new PgError({
          message: "Failed to write data to the connection",
        });
      }
      totalBytesWritten += bytesWritten;
    }
  }
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    if (this.devMode) {
      if (this.connectionParams.connectionType !== "dev") {
        throw new PgError({
          message: "Dev mode only supports TCP connection type",
        });
      }
      const conn = new InPgConn({
        hostname: this.connectionParams.host,
        port: this.connectionParams.port,
      });
      await conn.connect();
      this.conn = conn;
      this.reader = new MessageReader(this.conn);
      return;
    }
    switch (this.connectionParams.connectionType) {
      case "tcp": {
        this.conn = await Deno.connect({
          port: this.connectionParams.port,
          hostname: this.connectionParams.host,
        });
        break;
      }
      case "socket": {
        this.conn = await Deno.connect({
          transport: "unix",
          path: this.connectionParams.socketPath,
        });
        break;
      }
    }

    this.reader = new MessageReader(this.conn);
    const writer = this.writer;
    writer.addInt32(196608);
    writer.addCString("user");
    writer.addCString(this.connectionParams.user);
    writer.addCString("database");
    writer.addCString(this.connectionParams.database);
    if (this.connectionParams.options) {
      for (
        const [key, value] of Object.entries(
          this.connectionParams.options,
        )
      ) {
        writer.addCString(key);
        writer.addCString(value);
      }
    }
    writer.addCString("");

    await this.write(writer.message);
    // const data = await reader(this.conn)
    // messageParser(data)
    // return
    const client = new ScramClient(
      this.connectionParams.user,
      this.connectionParams.password as string,
    );
    while (this.status !== "connected") {
      await this.reader.nextMessage();
      switch (this.reader.messageType) {
        case "R": {
          const authType = this.reader.readInt32();

          switch (authType) {
            case AUTH.NO_AUTHENTICATION: {
              break;
            }
            case AUTH.CLEAR_TEXT: {
              const password = this.connectionParams.password;
              this.writer.setMessageType("p");
              this.writer.addCString(password);
              await this.write(this.writer.message);
              break;
            }
            case AUTH.MD5: {
              throw new PgError({
                message: "MD5 authentication not implemented",
              });

              //  md5 authentication
            }
            case AUTH.SASL_STARTUP: {
              const clientFirstMessage = client.composeChallenge();
              this.writer.reset();
              this.writer.setMessageType("p");
              this.writer.addCString("SCRAM-SHA-256");
              this.writer.addInt32(clientFirstMessage.length);
              this.writer.addString(clientFirstMessage);

              await this.write(this.writer.message);

              break;
            }
            case AUTH.SASL_CONTINUE: {
              const utf8Decoder = new TextDecoder("utf-8");
              const message = this.reader.readAllBytes();

              await client.receiveChallenge(utf8Decoder.decode(message));
              const clientFinalMessage = await client.composeResponse();
              this.writer.reset();
              this.writer.setMessageType("p");
              this.writer.addString(clientFinalMessage);
              await this.write(this.writer.message);

              break;
            }
            case AUTH.SASL_FINAL: {
              const message = this.reader.readAllBytes();

              await client.receiveResponse(this.decode(message));
              break;
            }
            default: {
              throw new PgError({
                message: "Unknown authentication type",
              });
            }
          }

          break;
        }
        case "S": {
          const param = this.reader.readCString();
          if (param === null) {
            throw new PgError({ message: "Server parameter is null" });
          }

          const nextString = this.reader.readCString();
          if (nextString === null) {
            throw new PgError({ message: "Server parameter value is null" });
          }
          this.serverParams[param] = nextString;
          break;
        }
        case "Z": {
          this.status = "connected";
          const status = this.reader.readString(1) as "I" | "T" | "E";

          this.serverStatus = statusMap[status];

          break;
        }
        case "E": {
          const error = this.readError();
          throw new PgError(error);
        }
        case "K": {
          // const keyData = new DataView(this.reader.readAllBytes().buffer);
          const pid = this.reader.readInt32();
          const key = this.reader.readInt32();
          this.cancelInfo = { pid, secret: key };
          break;
        }
        default: {
          throw new PgError({ message: "Unknown message type" });
        }
      }
    }
  }

  async terminate(): Promise<void> {
    this.writer.reset();
    this.writer.setMessageType("X");

    await this.write(this.writer.message).catch((e) => {
      if (!(e instanceof Deno.errors.BrokenPipe)) {
        throw e;
      }
    }).finally(() => {
      this.conn.close();
      this.status = "notConnected";
      this.conn = null as any;
    });
    this.reader = new MessageReader(this.conn);
    throw new PgError({
      name: "terminate",
      message: "Unknown message type",
    });
  }
  async shutdown(): Promise<void> {
    this.writer.reset();
    this.writer.setMessageType("X");
    await this.write(this.writer.message)
      .catch((e) => {
        if (!(e instanceof Deno.errors.BrokenPipe)) {
          throw e;
        }
      }).finally(() => {
        this.conn.close();
        this.status = "notConnected";
        this.conn = null as any;
      });
  }
  async reset(): Promise<void> {
    this.writer.reset();
    await this.reader.clearBuffer();
    this.conn.readable.cancel();
    this.conn.writable.close();

    this.status = "notConnected";
    this.conn = null as any;
    this.reader = null as any;
    await this.connect();
  }

  private readError(): Record<string, any> {
    const errorFields: Record<string, any> = {};
    let offset = 0;
    while (this.reader.offset < this.reader.messageLength) {
      const field = this.reader.readChar() as
        | keyof typeof errorCodeMap
        | null;
      if (!field) {
        break;
      }
      errorFields[errorCodeMap[field]] = this.reader.readCString();
      offset++;
      if (offset > this.reader.messageLength) {
        break;
      }
    }
    errorFields["name"] = pgErrorMap[
      errorFields["code"] as keyof typeof pgErrorMap
    ];
    return errorFields;
  }
  private readNotice(): Record<string, any> {
    const errorFields: Record<string, any> = {};
    let offset = 0;
    while (this.reader.offset < this.reader.messageLength) {
      const field = this.reader.readChar() as
        | keyof typeof errorCodeMap
        | null;
      if (!field) {
        break;
      }
      errorFields[errorCodeMap[field]] = this.reader.readCString();
      offset++;
      if (offset > this.reader.messageLength) {
        break;
      }
    }
    errorFields["name"] = pgErrorMap[
      errorFields["code"] as keyof typeof pgErrorMap
    ];
    return errorFields;
  }
  private parseRowDescription(): ColumnDescription[] {
    const columnCount = this.reader.readInt16();

    const columns: ColumnDescription[] = [];
    for (let i = 0; i < columnCount; i++) {
      const name = this.reader.readCString();
      if (name === null) {
        throw new PgError({ message: "Column name is null" });
      }
      const tableID = this.reader.readInt32();
      const columnID = this.reader.readInt16();
      const dataTypeID = this.reader.readInt32();
      const dataTypeSize = this.reader.readInt16();
      const dataTypeModifier = this.reader.readInt32();
      const format = this.reader.readInt16();
      const column: ColumnDescription = {
        name,
        camelName: convertString(name, "camel"),
        tableID,
        columnID,
        dataTypeID,
        dataType: getDataType(dataTypeID),
        dataTypeSize,
        dataTypeModifier,
        format,
      };
      columns.push(column);
    }

    return columns;
  }

  async query<T extends Record<string, any>>(
    query: string,
  ): Promise<QueryResponse<T>> {
    const writer = this.writer;
    writer.setMessageType("Q");
    writer.addCString(query);
    const message = writer.message;
    await this.write(message);

    let readyForQuery;
    const fields: ColumnDescription[] = [];
    const data: T[] = [];
    const errors: any[] = [];
    const notices: any[] = [];
    let gotDescription = false;
    let rowCount = 0;
    while (!readyForQuery) {
      await this.reader.nextMessage();
      const messageType = this.reader
        .messageType as keyof SimpleQueryResponse;
      switch (messageType) {
        case QR_TYPE.ROW_DESCRIPTION: {
          if (gotDescription) {
            throw new PgError({ message: "Got row description twice" });
          }
          gotDescription = true;
          const columns = this.parseRowDescription();

          fields.push(...columns);
          break;
        }
        case QR_TYPE.DATA_ROW: {
          rowCount++;
          const columnCount = this.reader.readInt16();
          const row = {} as Record<string, any>;
          const offsets = new Array(columnCount);
          for (let i = 0; i < columnCount; i++) {
            const field = fields[i];
            const length = this.reader.readInt32(); //
            offsets[i] = length;
            if (length === -1) {
              row[field.camelName] = null;

              continue;
            }
            if (length === 0) {
              this.decode(this.reader.currentMessage);
              row[field.camelName] = null;
              continue;
            }

            const column = this.reader.readBytes(length);

            row[field.camelName] = convertToDataType(
              column,
              field.dataTypeID,
              field.dataType,
            );
          }
          data.push(row as T);

          break;
        }
        case QR_TYPE.READY_FOR_QUERY: {
          const serverStatus = this.reader.readString(1) as
            | "I"
            | "T"
            | "E";
          this.serverStatus = statusMap[serverStatus];
          if (serverStatus === "E") {
            const error = this.readError();
            errors.push(error);
          }
          readyForQuery = true;
          break;
        }
        case QR_TYPE.ERROR_RESPONSE: {
          const error = this.readError();
          errors.push(error);
          break;
        }
        case QR_TYPE.EMPTY_QUERY_RESPONSE: {
          // this is a no-op, we don't need to do anything here. CHECK THIS
          break;
        }
        case QR_TYPE.PARSE_COMPLETE: {
          // this is a no-op, we don't need to do anything here. CHECK THIS
          break;
        }
        case QR_TYPE.CLOSE_COMPLETE: {
          // this is a no-op, we don't need to do anything here. CHECK THIS
          break;
        }

        case QR_TYPE.COMMAND_COMPLETE: {
          const _message = this.reader.readAllBytes(); // read the message. we don't need it since we are not parsing it or using it downstream but we need to read it to move the reader forward
          break;
        }
        case QR_TYPE.BLANK: {
          // this is a no-op, we don't need to do anything here. CHECK THIS
          break;
        }
        case QR_TYPE.NOTICE_RESPONSE: {
          const notice = this.readNotice();
          notices.push(notice);
          break;
        }
        default: {
          await this.terminate();
        }
      }
    }

    if (errors.length) {
      throw new PgError({ ...errors[0], query });
    }

    return {
      rowCount: data.length,
      rows: data,
      columns: fields,
    };
  }
}
