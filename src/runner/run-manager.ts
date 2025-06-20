import type { CloudConfig } from "#types/mod.ts";
import {
  generateConfigSchema,
  loadCloudConfigFile,
} from "../cloud-config/cloud-config.ts";
import { InCloud } from "../cloud/cloud-common.ts";
import { type InLog, inLog } from "../in-log/in-log.ts";
import { makeLogo } from "../in-log/logo.ts";
import { initCloud } from "../init.ts";
import ColorMe from "../utils/color-me.ts";
import convertString from "../utils/convert-string.ts";
import { center } from "../utils/format-utils.ts";
import { joinPath } from "../utils/path-utils.ts";
import { getCoreCount } from "./multicore.ts";
import type { RunnerMode } from "./types.ts";

export class RunManager {
  rootPath: string;
  coreCount: number;
  brokerProc?: Deno.ChildProcess;
  queueProc?: Deno.ChildProcess;
  dbProc?: Deno.ChildProcess;
  serveProcs: Array<Deno.ChildProcess>;
  port?: string;
  hostname?: string;
  appName: string;
  isReloading: boolean = false;
  watch?: boolean;
  autoMigrate?: boolean;
  autoTypes?: boolean;
  constructor(rootPath: string) {
    this.serveProcs = [];
    this.coreCount = 1;
    // Initialize the RunManager

    this.rootPath = rootPath;
    this.appName = Deno.env.get("APP_NAME") || "InSpatial";
  }

  async setupWatcher() {
    const dirs = Deno.readDirSync(this.rootPath);
    const paths = [];
    for (const item of dirs) {
      if (item.isDirectory && item.name != ".inspatial") {
        paths.push(joinPath(this.rootPath, item.name));
      }
      if (item.isFile && item.name.endsWith("ts")) {
        paths.push(joinPath(this.rootPath, item.name));
      }
    }
    const watcher = Deno.watchFs(paths, {
      recursive: true,
    });
    for await (const event of watcher) {
      switch (event.kind) {
        case "create":
        case "modify":
        case "remove":
        case "rename":
          this.handleWatchEvent(event);
          break;
        default:
          break;
      }
    }
  }
  handleWatchEvent(event: Deno.FsEvent) {
    for (const path of event.paths) {
      if (path.endsWith(".ts")) {
        if (this.isReloading) {
          return;
        }
        this.isReloading = true;
        inLog.warn(
          `File change detected, reloading...`,
          convertString(this.appName, "title", true),
        );
        this.reload();
        return;
        // Here you can add logic to handle the file change, like restarting servers
      }
    }
  }
  reload() {
    this.serveProcs.forEach((proc) => {
      if (proc.pid) {
        proc.kill("SIGTERM");
      }
    });
    this.serveProcs = [];
    if (this.queueProc && this.queueProc.pid) {
      this.queueProc.kill("SIGTERM");
    }
    this.queueProc = undefined;
    this.spawnMigrator().then((success) => {
      if (!success) {
        inLog.error(
          "Migration failed. Please check the logs for details.",
          convertString(this.appName, "title", true),
        );
        return;
      }
      this.spawnServers();
      this.spawnQueue();
      this.isReloading = false;
    });
  }

  async init(appName: string, config: CloudConfig): Promise<void> {
    Deno.args.forEach((arg) => {
      if (arg === "--watch") {
        this.watch = true;
      }
    });
    this.coreCount = await getCoreCount();
    inLog.warn(
      `Initializing InSpatial Cloud for ${appName}...`,
      convertString(appName, "title", true),
    );
    this.appName = appName;
    // environment variables setup
    const hasConfig = loadCloudConfigFile(this.rootPath);
    const inCloud = new InCloud(appName, config, "manager");

    await inCloud.init();
    if (!hasConfig) {
      generateConfigSchema(inCloud);
      initCloud(inCloud);
    }
    const embeddedDb = inCloud.getExtensionConfigValue("orm", "embeddedDb");
    this.autoMigrate = inCloud.getExtensionConfigValue("orm", "autoMigrate");
    this.autoTypes = inCloud.getExtensionConfigValue("orm", "autoTypes");

    this.hostname = inCloud.getExtensionConfigValue("cloud", "hostName");
    this.port = inCloud.getExtensionConfigValue("cloud", "port");
    const brokerPort = inCloud.getExtensionConfigValue<number>(
      "cloud",
      "brokerPort",
    );
    const queuePort = inCloud.getExtensionConfigValue<number>(
      "cloud",
      "queuePort",
    );

    if (embeddedDb) {
      const embeddedDbPort = inCloud.getExtensionConfigValue<number>(
        "orm",
        "embeddedDbPort",
      );
      this.spawnDB(embeddedDbPort);
    }
    await inCloud.boot();
    if (this.autoMigrate || this.autoTypes) {
      await this.spawnMigrator();
    }
    this.spawnBroker(brokerPort);
    this.spawnQueue();
    const procCount = this.spawnServers();
    const rows: Array<string> = [
      `Server Processes: ${procCount} spawned`,
      makeRunning(
        "Message Broker",
        this.brokerProc?.pid !== undefined,
        brokerPort,
      ),
      makeRunning(
        "InQueue",
        this.queueProc?.pid !== undefined,
        queuePort,
      ),
    ];
    if (embeddedDb) {
      rows.push(
        makeRunning(
          "Embedded DB",
          this.dbProc?.pid !== undefined,
          inCloud.getExtensionConfigValue<number>("orm", "embeddedDbPort") || 0,
        ),
      );
    }
    this.printInfo(inCloud.inLog, [rows.map((row) => center(row)).join("\n")]);
    if (this.watch) {
      inLog.info(
        "Watching for file changes. Press Ctrl+C to stop.",
        convertString(this.appName, "title", true),
      );
      this.setupWatcher();
    }
  }
  spawnServers(): number {
    if (this.serveProcs.length >= this.coreCount) {
      throw new Error(
        `Cannot spawn more servers than the core count (${this.coreCount}).`,
      );
    }
    let totalCount = 0;
    for (let i = 0; i < this.coreCount; i++) {
      this.spawnServer({
        instanceNumber: i.toString(),
        reusePort: true,
      });
      totalCount++;
    }
    return totalCount;
  }
  spawnDB(port: number) {
    const dataPath = joinPath(this.rootPath, ".inspatial", "db-data");
    this.dbProc = this.spawnProcess("db", [], {
      CLOUD_DB_DATA: dataPath,
      EMBEDDED_DB_PORT: port.toString(),
    });
  }
  async spawnMigrator(): Promise<boolean> {
    const proc = this.spawnProcess("migrator", []);
    const status = await proc.status;
    return status.success;
  }
  spawnServer(config?: {
    instanceNumber?: string;
    reusePort?: boolean;
  }): void {
    const proc = this.spawnProcess("server", ["--unstable-net"], {
      REUSE_PORT: config?.reusePort ? "true" : "false",
      SERVE_PROC_NUM: config?.instanceNumber || "_",
    });
    this.serveProcs.push(proc);
  }
  spawnBroker(port: number): void {
    if (this.brokerProc) {
      console.log("Broker is already running.");
      return;
    }
    this.brokerProc = this.spawnProcess("broker", [], {
      BROKER_PORT: port.toString(),
      APP_NAME: this.appName,
    });
  }
  spawnQueue(): void {
    if (this.queueProc) {
      console.log("Queue is already running.");
      return;
    }
    this.queueProc = this.spawnProcess("queue");
  }
  spawnProcess(
    mode: RunnerMode,
    flags: Array<string> = [],
    env: Record<string, string> = {},
  ): Deno.ChildProcess {
    const cmd = new Deno.Command(Deno.execPath(), {
      args: ["run", "-A", ...flags, "main.ts"],
      cwd: this.rootPath,
      env: {
        CLOUD_RUNNER_MODE: mode,
        ...env,
      },
    });
    const process = cmd.spawn();
    return process;
  }

  printInfo(inLog: InLog, rows: Array<string> = []) {
    const logo = makeLogo("downLeft", "brightMagenta");

    const url = `http://${this.hostname}:${this.port}`;

    const output = [
      logo,
      center(
        ColorMe.chain("basic").content(
          "InSpatial Cloud",
        ).color("brightMagenta")
          .content(" running at ")
          .color("brightWhite")
          .content(url)
          .color("brightCyan")
          .end(),
      ),
      ...rows.map((row) => center(row)),
      center(
        "You can ping the server:",
      ),
      ColorMe.fromOptions(
        center(
          `http://${this.hostname}:${this.port}/api?group=api&action=ping`,
        ),
        {
          color: "brightYellow",
        },
      ),
    ];
    inLog.info(
      output.join("\n\n"),
      convertString(this.appName, "title", true),
    );
  }
}

function makeRunning(
  serviceName: string,
  isRunning: boolean,
  port: number,
): string {
  const output = ColorMe.standard().content(`${serviceName}: `).color(
    "brightBlue",
  );
  if (isRunning) {
    return output.content("Running").color("brightGreen").content(" on port ")
      .color(
        "white",
      ).content(port.toString()).color("brightYellow").end();
  }
  return output.content("Not running").color("brightRed").end();
}
