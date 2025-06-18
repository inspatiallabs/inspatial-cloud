import type { CloudExtension } from "@inspatial/cloud";
import { InCloudBroker } from "./cloud/cloud-broker.ts";
import { RunManager } from "./runner/run-manager.ts";
import type { CloudRunnerMode } from "./runner/types.ts";
import type { CloudConfig } from "#types/mod.ts";
import { InCloudServer } from "./cloud/cloud-server.ts";
import { InCloudQueue } from "./cloud/cloud-queue.ts";

import { CloudDB } from "./cloud/cloud-db.ts";
import { InCloudCommon } from "./cloud/cloud-common.ts";

export class InCloud {
  #mode?: CloudRunnerMode;
  #manager?: RunManager;
  rootPath: string;
  #initialized: boolean = false;
  #appName: string;
  #config: CloudConfig;

  constructor(appName: string, config?: {
    extensions?: Array<CloudExtension>;
  }) {
    this.#appName = appName;
    this.#config = {
      extensions: config?.extensions || [],
    };

    this.rootPath = Deno.cwd();
  }

  run() {
    if (this.#initialized) {
      console.warn("InCloud is already initialized. Skipping initialization.");
      return;
    }
    this.#mode = this.getMode();

    switch (this.#mode) {
      case "manager":
        this.#initManager();
        break;
      case "broker":
        this.#initBroker();
        break;
      case "server":
        this.#initServer();
        break;
      case "queue":
        this.#initQueue();
        break;
      case "db":
        this.#initDB();
        break;
      case "migrator":
        this.#initMigrator();
        break;
      default:
        throw new Error(`Unknown mode: ${this.#mode}`);
    }
  }

  async #initManager() {
    if (this.#mode != "manager") {
      throw new Error("Manager can only be initialized in 'manager' mode.");
    }

    this.#manager = new RunManager(this.rootPath);

    await this.#manager.init(this.#appName, this.#config);
  }

  #initBroker() {
    const broker = new InCloudBroker(this.#appName);

    broker.run();
  }

  #initServer() {
    const instanceNumber = Deno.env.get("SERVE_PROC_NUM");
    const inCloud = new InCloudServer(
      this.#appName,
      this.#config,
      instanceNumber,
    );

    inCloud.run();
  }
  #initDB() {
    const pgDataPath = Deno.env.get("CLOUD_DB_DATA");
    if (!pgDataPath) {
      throw new Error("CLOUD_DB_DATA environment variable is not set.");
    }
    const cloudDB = new CloudDB(pgDataPath);
    cloudDB.start();
  }
  async #initMigrator() {
    const inCloud = new InCloudCommon(
      this.#appName,
      this.#config,
      "migrator",
    );
    await inCloud.init();
    await inCloud.boot();
    await inCloud.orm.migrate();
    Deno.exit(0);
  }
  #initQueue() {
    const inCloud = new InCloudQueue(this.#appName, this.#config);
  }
  /**
   * Determines the mode of the CloudRunner based on the environment variable `CLOUD_RUNNER_MODE`.
   * Valid modes are: `manager`, `server`, `broker`, and `queue`.
   * If the environment variable is not set or set to `manager`, it defaults to `manager`.
   * Throws an error if an invalid mode is provided.
   */
  getMode(): CloudRunnerMode {
    const mode = Deno.env.get("CLOUD_RUNNER_MODE");
    switch (mode) {
      case "server":
      case "broker":
      case "queue":
      case "db":
      case "migrator":
        return mode as CloudRunnerMode;
      case undefined:
      case "manager":
        return "manager";
      default:
        throw new Error(
          `Invalid CLOUD_RUNNER_MODE: ${mode}. Expected one of: manager, server, broker, queue.`,
        );
    }
  }
}
