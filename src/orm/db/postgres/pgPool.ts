import { PostgresClient } from "#/orm/db/postgres/pgClient.ts";
import type {
  PgClientConfig,
  PgPoolConfig,
  QueryResponse,
} from "#/orm/db/postgres/pgTypes.ts";
import { PgError } from "#/orm/db/postgres/pgError.ts";
import { InPGClient } from "./in-pg/in-pg-client.ts";

class PostgresPoolClient {
  locked: boolean;
  client: PostgresClient;
  close: boolean;
  config: PgClientConfig;
  constructor(config: PgClientConfig, isDev?: boolean) {
    this.close = false;
    this.config = config;
    this.locked = false;
    if (isDev) {
      this.client = new InPGClient(config);
      return;
    }
    this.client = new PostgresClient(config);
  }
  async connect(): Promise<void> {
    await this.client.connect();
  }

  async reset(): Promise<void> {
    await this.client.reset();
    this.locked = false;
  }
  async query<T extends Record<string, any>>(
    query: string,
  ): Promise<QueryResponse<T>> {
    const response = await this.client.query<T>(query).catch(async (e) => {
      if (e instanceof PgError && e.name === "terminate") {
        this.client = new PostgresClient(this.config);
        await this.client.connect();
        return await this.query<T>(query);
      }
      throw e;
    }).finally(() => {
      this.locked = false;
    });
    return response;
  }
  get connected(): boolean {
    return this.client.connected;
  }
}

export class PostgresPool {
  private readonly clients: PostgresPoolClient[];
  private readonly size: number;
  private readonly lazy: boolean;
  private readonly clientConfig: PgClientConfig;
  private readonly maxWait: number;
  private readonly maxClients: number;
  constructor(config: PgPoolConfig) {
    const { pool, clientConfig } = config;

    this.clients = [];
    this.maxWait = pool.idleTimeout || 5000;
    this.clientConfig = clientConfig;
    if (config.useDev) {
      this.size = 1;
      this.lazy = false;
      this.maxClients = 1;

      this.clients = [
        new PostgresPoolClient(clientConfig, true),
      ];
      return;
    }
    this.maxClients = pool.maxSize || 10;
    this.clientConfig = clientConfig;

    this.size = pool.size || 1;

    if (this.size > this.maxClients) {
      this.maxClients = this.size;
    }
    this.lazy = pool.lazy || false;

    for (let i = 0; i < this.size; i++) {
      this.clients.push(new PostgresPoolClient(this.clientConfig));
    }
  }

  async initialized(): Promise<void> {
    if (this.lazy) {
      return;
    }
    for (const client of this.clients) {
      await client.connect();
    }
  }
  private async getClient(): Promise<PostgresPoolClient> {
    let client: PostgresPoolClient | undefined;
    const start = Date.now();
    while (!client) {
      if (Date.now() - start > this.maxWait) {
        throw new PgError({
          message: "Timeout waiting for client",
          name: "timeout",
        });
      }
      client = this.clients.find((c) => !c.locked);
      if (!client) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    client.locked = true;
    await client.connect();
    return client;
  }

  private returnClient(client: PostgresPoolClient): void {
    client.locked = false;
  }
  private replaceClient(client: PostgresPoolClient): void {
    client.client = new PostgresClient(this.clientConfig);
  }
  async query<T extends Record<string, any>>(
    query: string,
  ): Promise<QueryResponse<T>> {
    const client = await this.getClient();
    const result = await client.query<T>(query);

    this.returnClient(client);
    return result;
  }
}
