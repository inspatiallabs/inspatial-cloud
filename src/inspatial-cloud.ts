import { CloudExtension } from "@inspatial/cloud";
import { InCloudBroker } from "~/cloud/cloud-broker.ts";
import type { CloudConfig } from "#types/mod.ts";
import { InCloudServer } from "~/cloud/cloud-server.ts";

import type { ExtensionOptions } from "~/app/types.ts";
import convertString from "~/utils/convert-string.ts";
import { CloudDB } from "~/orm/db/postgres/in-pg/cloud-db.ts";
import { InQueue } from "~/in-queue/in-queue.ts";
import { InCloudInit } from "./cloud/cloud-init.ts";
import type { CloudRunnerMode } from "../cli/src/types.ts";
import { InCloudMigrator } from "./cloud/cloud-migrator.ts";

class InCloudRunner {
  #mode?: CloudRunnerMode;
  rootPath: string;
  #initialized: boolean = false;
  #appName: string;
  #config: CloudConfig;

  constructor(appName: string, config?: {
    extensions?: Array<CloudExtension>;
  }) {
    this.#appName = convertString(appName, "camel", true);
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
      case "init":
        this.#init();
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

  #init() {
    const inCloud = new InCloudInit(
      this.#appName,
      this.#config,
    );
    inCloud.validateConfig();
  }

  #initBroker() {
    const port = Deno.env.get("BROKER_PORT");
    if (!port) {
      throw new Error("BROKER_PORT environment variable is not set.");
    }
    const broker = new InCloudBroker(parseInt(port));

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
    const port = Deno.env.get("EMBEDDED_DB_PORT");
    if (!port) {
      throw new Error("EMBEDDED_DB_PORT environment variable is not set.");
    }
    if (!pgDataPath) {
      throw new Error("CLOUD_DB_DATA environment variable is not set.");
    }
    const cloudDB = new CloudDB(pgDataPath);
    cloudDB.start(parseInt(port));
  }
  async #initMigrator() {
    const inCloud = new InCloudMigrator(
      this.#appName,
      this.#config,
    );
    inCloud.init();
    const { autoTypes, autoMigrate } = inCloud.getExtensionConfig("orm");

    if (!autoMigrate && !autoTypes) {
      Deno.exit(0);
    }
    // await inCloud.boot();
    if (autoMigrate) {
      await inCloud.orm.init();
      await inCloud.migrate();
    }
    if (autoTypes) {
      await inCloud.orm.generateInterfaces();
    }

    Deno.exit(0);
  }
  #initQueue() {
    const inCloud = new InQueue(this.#appName, this.#config);
    inCloud.run();
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
      case "init":
      case "server":
      case "broker":
      case "queue":
      case "db":
      case "migrator":
        return mode as CloudRunnerMode;
      default:
        throw new Error(
          `Invalid CLOUD_RUNNER_MODE: ${mode}. Expected one of: init, server, broker, queue, db, migrator.`,
        );
    }
  }
}
/**
 * Creates an InCloud instance and runs it.
 */
export function createInCloud(): void;
/**
 * Creates an InCloud instance with the specified app name and runs it.
 * @param appName - The name of the cloud application.
 */
export function createInCloud(appName: string): void;

/**
 * Creates an InCloud instance with the specified configuration and runs it.
 * @param config - The configuration for the cloud instance.
 */
export function createInCloud(extension: ExtensionOptions): void;
/**
 * Creates an InCloud instance with the specified app name and configuration, and runs it.
 * @param appName - The name of the cloud application.
 * @param config - The configuration for the cloud instance.
 */
export function createInCloud(
  appName: string,
  extensions: Array<CloudExtension>,
): void;
export function createInCloud(
  cloudNameOrConfigOrExt?: string | ExtensionOptions,
  extensions?: Array<CloudExtension>,
) {
  let appName: string = "myAwesomeCloud";
  const config: CloudConfig = {
    extensions: extensions || [],
  };
  if (typeof cloudNameOrConfigOrExt === "string") {
    appName = convertString(cloudNameOrConfigOrExt, "camel", true);
  } else if (Array.isArray(cloudNameOrConfigOrExt)) {
    config.extensions = cloudNameOrConfigOrExt;
  } else if (
    typeof cloudNameOrConfigOrExt === "object" &&
    "name" in cloudNameOrConfigOrExt
  ) {
    const extKey = convertString(cloudNameOrConfigOrExt.name, "camel", true);
    appName = extKey;
    const extLabel = convertString(
      cloudNameOrConfigOrExt.name,
      "title",
    );
    config.extensions = [
      new CloudExtension(
        extKey,
        { ...cloudNameOrConfigOrExt, label: extLabel },
      ),
    ];
  }

  const inCloudRunner = new InCloudRunner(appName, config);
  inCloudRunner.run();
}
