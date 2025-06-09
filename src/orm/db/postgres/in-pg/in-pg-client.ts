import { MessageReader } from "../messageReader.ts";
import { PostgresClient } from "../pgClient.ts";
import type { PgClientConfig } from "../pgTypes.ts";
import { InPG } from "./in-pg.ts";

export class InPGClient extends PostgresClient {
  #inPg: InPG;

  constructor(options: PgClientConfig) {
    super(options);
    const thisDir = import.meta.dirname;
    const inRoot = Deno.env.get("IN_ROOT");
    const pgDataRoot = `${inRoot}/pgdata`;
    this.#inPg = new InPG(`${thisDir}/src/inpg.wasm`, {
      PGDATA: pgDataRoot,
      MODE: "REACT",
      PGDATABASE: "postgres",
      PGUSER: "postgres",
      PREFIX: `${thisDir}/postgresql`,
      REPL: "N",
      debug: false,
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
