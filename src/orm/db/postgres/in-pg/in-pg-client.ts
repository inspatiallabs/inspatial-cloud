import { inLog } from "../../../../in-log/in-log.ts";
import { MessageReader } from "../messageReader.ts";
import { PostgresClient } from "../pgClient.ts";
import type { PgClientConfig } from "../pgTypes.ts";
import { InPG } from "./in-pg.ts";
import { normalizePath } from "./src/convert.ts";
import type { Output, OutputMore } from "./types.ts";

export class InPGClient extends PostgresClient {
  #inPg: InPG;
  constructor(options: PgClientConfig) {
    super(options);
    const thisDir = normalizePath(import.meta.dirname || "");
    const inRoot = Deno.env.get("IN_ROOT");
    const pgDataRoot = normalizePath(`${inRoot}/pgdata`);

    this.#inPg = new InPG({
      env: {
        PGDATA: pgDataRoot,
        MODE: "REACT",
        PGDATABASE: "template1",
        PGUSER: "postgres",
        PREFIX: `/tmp/pglite`,
        REPL: "N",
      },
      pgFilesDir: `${thisDir}`,
      onStderr: (out) => {
        console.log(out.message);
      },
      onStdout: (out) => {
        console.log(out.message);
      },
      debug: options.debug,
      args: [
        "--single",
        "postgres",
        "--",
        `PGDATA=${pgDataRoot}`,
        `PREFIX=/tmp/pglite`,
        "PGDATABASE=template1",
        `PGUSER=postgres`,
        "REPL=N",
      ],
    });
  }
  #logOut(out: Output | OutputMore) {
    if ("type" in out) {
      const subject = `InPG - ${out.type}`;
      switch (out.type) {
        case "LOG":
        case "NOTICE":
          inLog.info(out.message, {
            subject,
          });
          break;
        case "DEBUG":
          inLog.debug(out.message, {
            subject,
          });
          break;
        case "WARNING":
          inLog.warn(out.message, {
            subject,
          });
          break;
        case "ERROR":
          inLog.error(out.message, {
            subject,
          });
          break;
        default:
          console.log(out.type);
          Deno.exit();
      }
      return true;
    }
    return false;
  }
  override async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    inLog.warn("Initializing embedded database...", {
      subject: "InPG",
    });
    await this.#inPg.run();
    inLog.info("Database Initialized!", {
      subject: "InPG",
    });
    this.conn = this.#inPg;
    this.reader = new MessageReader(this.conn);
    this.status = "connected";
  }
}
