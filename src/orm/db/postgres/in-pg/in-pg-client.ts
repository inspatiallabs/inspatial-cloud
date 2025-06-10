import { MessageReader } from "../messageReader.ts";
import { PostgresClient } from "../pgClient.ts";
import type { PgClientConfig } from "../pgTypes.ts";
import { InPG } from "./in-pg.ts";
import { normalizePath } from "./src/convert.ts";

export class InPGClient extends PostgresClient {
  #inPg: InPG;

  constructor(options: PgClientConfig) {
    super(options);
    const thisDir = normalizePath(import.meta.dirname || "");
    const inRoot = Deno.env.get("IN_ROOT");
    const pgDataRoot = normalizePath(`${inRoot}/pgdata`);
    console.log({ pgDataRoot });
    this.#inPg = new InPG(`${thisDir}/src/inpg.wasm`, {
      PGDATA: pgDataRoot,
      MODE: "REACT",
      PGDATABASE: "postgres",
      PGUSER: "postgres",
      PREFIX: `${thisDir}/postgresql`,
      REPL: "N",
      debug: options.debug,
    });
  }
  override async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    await this.#inPg.run();
    this.conn = this.#inPg;
    this.reader = new MessageReader(this.conn);
    this.status = "connected";
  }
}
