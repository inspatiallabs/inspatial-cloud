import type { CloudConfig } from "#types/mod.ts";
import {
  generateConfigSchema,
  loadCloudConfigFile,
} from "../cloud-config/cloud-config.ts";
import { InCloud } from "../cloud/cloud-common.ts";
import { makeLogo } from "~/terminal/logo.ts";
import { initCloud } from "../init.ts";
import ColorMe from "~/terminal/color-me.ts";
import convertString from "~/utils/convert-string.ts";
import { center } from "~/terminal/format-utils.ts";
import { joinPath } from "~/utils/path-utils.ts";
import { getCoreCount } from "./multicore.ts";
import type { RunnerMode } from "./types.ts";
import { type InLog, inLog } from "#inLog";

const logo = makeLogo({
  symbol: "alt2DownLeft",
  fillSymbol: "alt2UpRight",
  blankColor: "black",
  fillColor: "brightMagenta",
  outlineColor: "white",
});
export class RunManager {
  rootPath: string;
  coreCount: number;
  brokerProc?: Deno.ChildProcess;
  queueProc?: Deno.ChildProcess;
  dbProc?: Deno.ChildProcess;
  serveProcs: Map<number, Deno.ChildProcess>;
  port?: number;
  hostname?: string;
  appName: string;
  isReloading: boolean = false;
  watch?: boolean;
  autoMigrate?: boolean;
  autoTypes?: boolean;

  constructor(rootPath: string) {
    this.serveProcs = new Map();
    this.brokerProc = undefined;
    this.queueProc = undefined;
    this.coreCount = 1;
    this.rootPath = rootPath;
    this.appName = Deno.env.get("APP_NAME") || "InSpatial";
  }
  async init(appName: string, config: CloudConfig): Promise<void> {
    // Terminal.clear();
    Deno.args.forEach((arg) => {
      if (arg === "--watch") {
        this.watch = true;
      }
    });

    this.coreCount = await getCoreCount();
    this.appName = appName;
    const hasConfig = loadCloudConfigFile(this.rootPath);
    const inCloud = new InCloud(appName, config, "manager");

    inCloud.init();
    if (!hasConfig) {
      generateConfigSchema(inCloud);
      initCloud(inCloud);
    }

    const { hostName, port, brokerPort, queuePort, mode } = inCloud
      .getExtensionConfig(
        "cloud",
      );
    if (mode == "development") {
      this.watch = true;
    }
    const { embeddedDb, embeddedDbPort, autoTypes, autoMigrate } = inCloud
      .getExtensionConfig(
        "orm",
      );

    this.autoMigrate = autoMigrate;
    this.autoTypes = autoTypes;
    this.hostname = hostName;
    this.port = port;

    if (embeddedDb) {
      this.spawnDB(embeddedDbPort);
    }
    this.spawnBroker(brokerPort);

    await inCloud.boot();
    if (this.autoMigrate || this.autoTypes) {
      await this.spawnMigrator();
    }
    this.spawnQueue();

    const procCount = this.spawnServers();

    let dbConnectionString = "";
    if (embeddedDb) {
      dbConnectionString = makeRunning(
        "Database",
        !!this.dbProc,
        embeddedDb ? embeddedDbPort : "unknown",
      );
    }
    if (!embeddedDb) {
      dbConnectionString = makeDBConnectionString(
        inCloud.getExtensionConfig("orm"),
      );
    }
    const rows = [
      makeRunning("Broker", !!this.brokerProc, brokerPort),
      makeRunning("Queue", !!this.queueProc, queuePort),
      dbConnectionString,
      makeRunning(
        "Server",
        this.serveProcs.size > 0,
        `${this.port} (${procCount} instances)`,
      ),
    ];
    this.printInfo(inCloud.inLog, rows);

    if (this.watch) {
      inLog.info(
        "Watching for file changes. Press Ctrl+C to stop.",
        convertString(this.appName, "title", true),
      );
      this.setupWatcher();
    }
    // Terminal.showCursor();
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
    this.isReloading = true;
    this.serveProcs.forEach((proc) => {
      if (proc.pid) {
        proc.kill("SIGTERM");
      }
    });

    if (this.queueProc && this.queueProc.pid) {
      this.queueProc.kill("SIGTERM");
    }
    this.queueProc = undefined;
    this.spawnMigrator().then((success) => {
      if (!success) {
        // inLog.error(
        //   "Migration failed. Please check the logs for details.",
        //   convertString(this.appName, "title", true),
        // );
        return;
      }
      this.spawnServers();
      this.spawnQueue();
      this.isReloading = false;
    });
  }

  spawnServers(): number {
    if (this.serveProcs.size >= this.coreCount) {
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
    inLog.warn(
      "Starting the embedded database....",
      convertString(this.appName, "title", true),
    );
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
    const pid = proc.pid;
    proc.status.then((_status) => {
      this.serveProcs.delete(pid);
    });
    this.serveProcs.set(proc.pid, proc);
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
    const output = [
      logo,
      "",
      ...rows.map((row) => center(row)),
      "",
      center(
        "You can ping the server:",
      ),
      ColorMe.fromOptions(
        center(
          `http://${this.hostname}:${this.port}/api?group=api&action=ping`,
        ),
        {
          color: "brightCyan",
        },
      ),
    ];
    inLog.info(
      output.join("\n"),
      convertString(this.appName, "title", true),
    );
  }
}
function makeDBConnectionString(dbConfig: any, connected?: boolean): string {
  const { dbConnectionType, dbHost, dbPort, dbName, dbUser } = dbConfig;
  if (connected) {
    const outConn = ColorMe.standard().content("Connected ").color(
      "brightGreen",
    ).content(
      "db: ",
    ).color("white").content(
      dbName,
    ).color("brightCyan");
    if (dbConnectionType === "socket") {
      outConn.content(" via ").color("white").content(
        dbConnectionType,
      ).color("brightCyan");
      return outConn.end();
    }
    return outConn.content(" at ").color("white").content(
      `${dbHost}:${dbPort}`,
    ).color("brightCyan").end();
  }
  const out = ColorMe.standard().content("via ").color("white").content(
    dbConnectionType,
  ).color("brightCyan").content(" db:").color("white").content(
    dbName,
  ).color("brightCyan").content(" user:").color("white").content(
    dbUser,
  ).color("brightCyan");

  if (dbConnectionType === "socket") {
    return out.end();
  }
  return out.content(" at ").color("white").content(
    `${dbHost}:${dbPort}`,
  ).color("brightCyan").end();
}
function makeRunning(
  name: string,
  isRunning: boolean,
  port: number | string = "unknown",
): string {
  const output = ColorMe.standard().content(`${name}: `).color("brightBlue");
  if (isRunning) {
    return output.content("Running").color("brightGreen").content(" on port ")
      .color(
        "white",
      ).content(port.toString()).color("brightYellow").end();
  }
  return output.content("Not running").color("brightRed").end();
}
