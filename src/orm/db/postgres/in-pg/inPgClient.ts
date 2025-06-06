import { MessageReader } from "../messageReader.ts";
import { PostgresClient } from "../pgClient.ts";
import type { PgClientConfig } from "../pgTypes.ts";
import { InPg } from "./in-pg.ts";

export class InPGClient extends PostgresClient {
  #inPg: InPg;

  constructor(options: PgClientConfig) {
    super(options);
    this.#inPg = new InPg();
  }
  override async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    await this.#inPg.init({
      database: this.connectionParams.database,
    });
    this.conn = this.#inPg;
    this.reader = new MessageReader(this.conn);
    this.status = "connected";
  }
}
