const inLog = new InLog({
  consoleDefaultStyle: "full",
  name: "InSpatial Cloud",
  traceOffset: 1,
});
const inLogSmall = new InLog({
  consoleDefaultStyle: "compact",
  name: "InSpatial Cloud",
  traceOffset: 1,
});
import { makeLogo } from "~/terminal/logo.ts";
import { InLog } from "~/in-log/in-log.ts";
import { getCoreCount } from "./multicore.ts";
import { loadCloudConfigFile } from "./cloud-config.ts";
import convertString from "~/utils/convert-string.ts";
import { joinPath } from "~/utils/path-utils.ts";
import { center } from "~/terminal/format-utils.ts";
import ColorMe from "~/terminal/color-me.ts";
import type { RunnerMode } from "./types.ts";

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
  appTitle: string = "InSpatial Cloud";
  isReloading: boolean = false;
  watch?: boolean;
  autoMigrate?: boolean;
  autoTypes?: boolean;
  moduleName: string;
  env: Record<string, string> = {};

  constructor(rootPath: string, moduleName?: string) {
    this.serveProcs = new Map();
    this.brokerProc = undefined;
    this.queueProc = undefined;
    this.coreCount = 1;
    this.rootPath = rootPath;
    this.moduleName = moduleName || "main.ts";
    this.appName = Deno.env.get("APP_NAME") || "InSpatial";
  }
  async init(): Promise<void> {
    this.coreCount = await getCoreCount();
    await this.spawnInit();
    const result = loadCloudConfigFile(this.rootPath);
    if (!result) {
      inLog.error(
        "No cloud-config.json file found. Please run `in init` to create one.",
        convertString(this.appName, "title", true),
      );
      Deno.exit(1);
    }
    const { config, env } = result;
    this.env = env;
    const { hostName, port, brokerPort, queuePort, cloudMode, name } =
      config.cloud;
    this.appName = name || this.appName;
    this.appTitle = convertString(this.appName, "title", true);
    if (cloudMode == "development") {
      this.watch = true;
    }
    const { embeddedDb, embeddedDbPort, autoTypes, autoMigrate } = config.orm;

    this.autoMigrate = autoMigrate;
    this.autoTypes = autoTypes;
    this.hostname = hostName || "localhost";
    this.port = port || 8000;

    if (embeddedDb) {
      this.spawnDB(embeddedDbPort);
    }
    this.spawnBroker(brokerPort);

    if (this.autoMigrate || this.autoTypes) {
      await this.spawnMigrator();
    }
    // Deno.exit();
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
        config.orm,
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
    this.printInfo(rows);

    if (this.watch) {
      inLog.info(
        "Watching for file changes. Press Ctrl+C to stop.",
        this.appTitle,
      );
      // this.setupWatcher();
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
      if (item.name.endsWith(".type.ts")) {
        continue;
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
      if (path.endsWith(".type.ts")) {
        // Ignore type files
        continue;
      }
      if (path.endsWith(".ts")) {
        if (this.isReloading) {
          return;
        }
        this.isReloading = true;
        inLogSmall.warn(
          `File change detected, reloading...`,
          this.appTitle,
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
        this.isReloading = false;
        // inLog.error(
        //   "Migration failed. Please check the logs for details.",
        //   convertString(this.appName, "title", true),
        // );
        return;
      }
      this.spawnServers();
      this.spawnQueue();
      this.isReloading = false;
      inLogSmall.info(
        "Reloaded successfully.",
        this.appTitle,
      );
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
  async spawnInit() {
    const proc = this.spawnProcess("init");
    const status = await proc.status;
    if (!status.success) {
      Deno.exit(1);
    }
    return true;
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
    const proc = this.spawnProcess("migrator", [], this.env);
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
      ...this.env,
    });
    const pid = proc.pid;
    proc.status.then((_status) => {
      this.serveProcs.delete(pid);
    });
    this.serveProcs.set(proc.pid, proc);
  }
  spawnBroker(port: number): void {
    if (this.brokerProc?.pid) {
      return;
    }
    this.brokerProc = this.spawnProcess("broker", [], {
      BROKER_PORT: port.toString(),
      APP_NAME: this.appName,
    });
  }
  spawnQueue(): void {
    if (this.queueProc?.pid) {
      return;
    }
    this.queueProc = this.spawnProcess("queue", [], this.env);
  }
  spawnProcess(
    mode: RunnerMode,
    flags: Array<string> = [],
    env: Record<string, string> = {},
  ): Deno.ChildProcess {
    const cmd = new Deno.Command(Deno.execPath(), {
      args: ["run", "-A", ...flags, this.moduleName],
      cwd: this.rootPath,
      env: {
        CLOUD_RUNNER_MODE: mode,
        ...env,
      },
    });
    const process = cmd.spawn();

    process.status.then((status) => {
      if (status.success) {
        return;
      }

      switch (status.code) {
        case 143: // SIGTERM
          if (mode === "server" || mode === "queue") {
            return; // Ignore SIGTERM for server and queue processes, it's a fs watcher restart
          }
      }
      const message = ColorMe.standard();
      message.content("Exit code ").color("white").content(
        status.code.toString(),
      ).color("brightRed");
      if (status.signal) {
        message.content(` (${status.signal})`).color("brightYellow");
      }
      inLogSmall.error(
        message.end(),
        `${this.appTitle}: ${mode}`,
      );
    });

    return process;
  }

  printInfo(rows: Array<string> = []) {
    const output = [
      logo,
      "",
      ...rows.map((row) => center(row)),
      "",
      center(
        "Static files are served at:",
      ),
      ColorMe.fromOptions(
        center(
          `http://${this.hostname}:${this.port}`,
        ),
        {
          color: "brightCyan",
        },
      ),
      "",
      center(
        "API is available at:",
      ),
      ColorMe.fromOptions(
        center(
          `http://${this.hostname}:${this.port}/api`,
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
    const outConn = ColorMe.standard()
      .content("Connected ").color(
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
  const out = ColorMe.standard().content("Database: ").color("brightBlue")
    .content("via ").color("white").content(
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
