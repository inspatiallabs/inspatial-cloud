import { makeLogo } from "~/terminal/logo.ts";
import { InLog } from "~/in-log/in-log.ts";
import { getCoreCount } from "#cli/multicore.ts";
import { loadCloudConfigFile } from "#cli/cloud-config.ts";
import convertString from "~/utils/convert-string.ts";
import { IS_WINDOWS, joinPath } from "~/utils/path-utils.ts";
import { center } from "~/terminal/format-utils.ts";
import ColorMe from "~/terminal/color-me.ts";
import type { RunnerMode } from "#cli/types.ts";

const logo = makeLogo({
  symbol: "alt2DownLeft",
  fillSymbol: "alt2UpRight",
  blankColor: "black",
  fillColor: "brightMagenta",
  outlineColor: "white",
});

function chooseDefaultCloudEntryPoint(rootPath: string): string {
  const mainPath = joinPath(rootPath, "main.ts");
  const cloudPath = joinPath(rootPath, "cloud.ts");

  try {
    Deno.statSync(mainPath); // exists > prefer main.ts
    return "main.ts";
  } catch {
    /* ignore */
  }

  try {
    Deno.statSync(cloudPath); // otherwise, prefer cloud.ts great for workspace monorepo for kit x cloud projects
    return "cloud.ts";
  } catch {
    /* ignore */
  }

  // final fallback for to base on main.ts
  return "main.ts";
}

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
  usingEmbeddedDb = false;
  embeddedDbPort: number | undefined = undefined;
  env: Record<string, string> = {};
  inLogSmall: InLog;
  inLog: InLog;

  constructor(rootPath: string, moduleName?: string) {
    const logOptions = {
      name: "InSpatial Cloud",
      traceOffset: 1,
      logFile: {
        logName: "cli-run",
        logPath: joinPath(rootPath, ".inspatial", "logs"),
      },
    };
    this.inLogSmall = new InLog({
      consoleDefaultStyle: "compact",
      ...logOptions,
    });
    this.inLog = new InLog({
      consoleDefaultStyle: "full",
      ...logOptions,
    });
    this.serveProcs = new Map();
    this.brokerProc = undefined;
    this.queueProc = undefined;
    this.coreCount = 1;
    this.rootPath = rootPath;
    this.moduleName = moduleName || chooseDefaultCloudEntryPoint(rootPath);
    this.appName = Deno.env.get("APP_NAME") || "InSpatial";
  }
  async init(): Promise<void> {
    this.addSignalListeners();
    this.coreCount = await getCoreCount({ single: true }); // skip multicore at the moment
    await this.spawnInit();
    const result = loadCloudConfigFile(this.rootPath);
    if (!result) {
      this.inLog.error(
        "No cloud-config.json file found. Please run `in init` to create one.",
        convertString(this.appName, "title", true)
      );
      Deno.exit(1);
    }
    const { config, env, customConfig: _customConfig } = result;
    this.env = env;
    const {
      hostName,
      servePort,
      brokerPort,
      queuePort,
      cloudMode,
      name,
      embeddedDb,
      embeddedDbPort,
      autoTypes,
      autoMigrate,
    } = config.core;
    this.appName = name || this.appName;
    this.appTitle = convertString(this.appName, "title", true);
    if (cloudMode == "development") {
      this.watch = true;
    }

    this.autoMigrate = autoMigrate;
    this.autoTypes = autoTypes;
    this.hostname = hostName || "localhost";
    this.port = servePort || 8000;

    if (embeddedDb) {
      this.usingEmbeddedDb = true;
      this.embeddedDbPort = embeddedDbPort;
      this.spawnDB(embeddedDbPort);
    }
    this.spawnBroker(brokerPort);

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
        embeddedDb ? embeddedDbPort : "unknown"
      );
    }
    if (!embeddedDb) {
      dbConnectionString = makeDBConnectionString(config.core);
    }
    const rows = [
      makeRunning("Broker", !!this.brokerProc, brokerPort),
      makeRunning("Queue", !!this.queueProc, queuePort),
      dbConnectionString,
      makeRunning(
        "Server",
        this.serveProcs.size > 0,
        `${this.port} (${procCount} instances)`
      ),
    ];
    this.printInfo(rows);

    if (this.watch) {
      this.inLog.info(
        "Watching for file changes. Press Ctrl+C to stop.",
        this.appTitle
      );
      this.setupWatcher();
    }
  }
  addSignalListeners() {
    Deno.addSignalListener("SIGINT", async () => {
      await this.shutdown("SIGINT");
    });
    if (IS_WINDOWS) {
      return;
    }
    Deno.addSignalListener("SIGTERM", async () => {
      await this.shutdown("SIGTERM");
    });
  }
  async shutdown(_signal: Deno.Signal): Promise<void> {
    this.inLogSmall.warn(`Shutting down gracefully...`, {
      compact: true,
      subject: this.appTitle,
    });
    for (const proc of this.serveProcs.values()) {
      // await killProc(proc, signal);
      await proc.status;
    }

    if (this.queueProc && this.queueProc.pid) {
      // await killProc(this.queueProc, signal);
      await this.queueProc.status;
    }
    if (this.brokerProc && this.brokerProc.pid) {
      // await killProc(this.brokerProc, signal);
      await this.brokerProc.status;
    }
    if (this.dbProc && this.dbProc.pid) {
      // await killProc(this.dbProc, signal);
      await this.dbProc.status;
    }

    this.inLogSmall.info("All processes have been shut down.", this.appTitle);
    Deno.exit(0);
  }
  async setupWatcher() {
    const paths: string[] = [];
    const setupPaths = (
      root: string,
      dirs: IteratorObject<Deno.DirEntry, unknown, unknown>
    ) => {
      for (const item of dirs) {
        if (item.isDirectory && !item.name.startsWith(".")) {
          paths.push(joinPath(root, item.name));
        }
        if (item.name.endsWith(".type.ts")) {
          continue;
        }
        if (item.isFile && item.name.endsWith("ts")) {
          paths.push(joinPath(root, item.name));
        }
      }
    };
    const dirs = Deno.readDirSync(this.rootPath);
    setupPaths(this.rootPath, dirs);
    try {
      const cloudPath = joinPath(this.rootPath, "..", "inspatial-cloud", "src");
      const cloudDirs = Deno.readDirSync(cloudPath);
      setupPaths(cloudPath, cloudDirs);
    } catch (_e) {
      // No inspatial-cloud directory, skip it
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
        this.inLogSmall.warn(
          `File change detected, reloading...`,
          this.appTitle
        );
        this.reload();
        return;
      }
    }
  }
  async reload() {
    this.isReloading = true;
    for (const [pid, proc] of this.serveProcs.entries()) {
      if (proc.pid) {
        await killProc(proc, "SIGINT");
      }
      this.serveProcs.delete(pid);
    }

    if (this.queueProc && this.queueProc.pid) {
      await killProc(this.queueProc, "SIGINT");
    }
    this.queueProc = undefined;
    const success = await this.spawnMigrator();
    if (!success) {
      this.isReloading = false;
      return;
    }

    this.spawnServers();
    this.spawnQueue();
    this.isReloading = false;
    this.inLogSmall.info("Reloaded successfully.", this.appTitle);
  }

  spawnServers(): number {
    if (this.serveProcs.size > this.coreCount) {
      throw new Error(
        `Cannot spawn more servers than the core count (${this.coreCount}).`
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
  async spawnInit(): Promise<true | never> {
    const proc = this.spawnProcess("init");
    const status = await proc.status;
    if (!status.success) {
      Deno.exit(1);
    }
    return true;
  }
  spawnDB(port: number) {
    this.inLog.warn(
      "Starting the embedded database....",
      convertString(this.appName, "title", true)
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
    if (!status.success) {
      // Migration failed, handle it
    }
    return status.success;
  }
  spawnServer(config?: { instanceNumber?: string; reusePort?: boolean }): void {
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
    env: Record<string, string> = {}
  ): Deno.ChildProcess {
    const cmd = new Deno.Command(Deno.execPath(), {
      args: ["run", "-A", ...flags, "--unstable-raw-imports", this.moduleName],
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
          break;
        case 174: // SIGSEGV
          if (mode === "migrator" && this.usingEmbeddedDb && this.dbProc) {
            killProc(this.dbProc, "SIGINT").then(() => {
              this.spawnDB(this.embeddedDbPort!);
              this.reload();
            });
          }
          return;
        case 1:
          if (
            (IS_WINDOWS && mode === "server") ||
            (mode === "queue" && this.isReloading)
          ) {
            // Ignore exit code 1 on Windows for server and queue processes during reload, it's because we used taskkill to kill the process
            return;
          }
          break;
      }
      const message = ColorMe.standard();
      message
        .content("Exit code ")
        .color("white")
        .content(status.code.toString())
        .color("brightRed");
      if (status.signal) {
        message.content(` (${status.signal})`).color("brightYellow");
      }
      this.inLogSmall.error(message.end(), `${this.appTitle}: ${mode}`);
    });

    return process;
  }

  printInfo(rows: Array<string> = []) {
    const output = [
      logo,
      "",
      ...rows.map((row) => center(row)),
      "",
      center("Static files are served at:"),
      ColorMe.fromOptions(center(`http://${this.hostname}:${this.port}`), {
        color: "brightCyan",
      }),
      "",
      center("API is available at:"),
      ColorMe.fromOptions(center(`http://${this.hostname}:${this.port}/api`), {
        color: "brightCyan",
      }),
    ];
    this.inLog.info(
      output.join("\n"),
      convertString(this.appName, "title", true)
    );
  }
}
function makeDBConnectionString(dbConfig: any, connected?: boolean): string {
  const { dbConnectionType, dbHost, dbPort, dbName, dbUser } = dbConfig;
  if (connected) {
    const outConn = ColorMe.standard()
      .content("Connected ")
      .color("brightGreen")
      .content("db: ")
      .color("white")
      .content(dbName)
      .color("brightCyan");
    if (dbConnectionType === "socket") {
      outConn
        .content(" via ")
        .color("white")
        .content(dbConnectionType)
        .color("brightCyan");
      return outConn.end();
    }
    return outConn
      .content(" at ")
      .color("white")
      .content(`${dbHost}:${dbPort}`)
      .color("brightCyan")
      .end();
  }
  const out = ColorMe.standard()
    .content("Database: ")
    .color("brightBlue")
    .content("via ")
    .color("white")
    .content(dbConnectionType)
    .color("brightCyan")
    .content(" db:")
    .color("white")
    .content(dbName)
    .color("brightCyan")
    .content(" user:")
    .color("white")
    .content(dbUser)
    .color("brightCyan");

  if (dbConnectionType === "socket") {
    return out.end();
  }
  return out
    .content(" at ")
    .color("white")
    .content(`${dbHost}:${dbPort}`)
    .color("brightCyan")
    .end();
}
function makeRunning(
  name: string,
  isRunning: boolean,
  port: number | string = "unknown"
): string {
  const output = ColorMe.standard().content(`${name}: `).color("brightBlue");
  if (isRunning) {
    return output
      .content("Running")
      .color("brightGreen")
      .content(" on port ")
      .color("white")
      .content(port.toString())
      .color("brightYellow")
      .end();
  }
  return output.content("Not running").color("brightRed").end();
}

async function killProc(process: Deno.ChildProcess, signal: Deno.Signal) {
  if (!process.pid) {
    return;
  }
  if (IS_WINDOWS) {
    const kill = new Deno.Command("taskkill", {
      args: ["/PID", process.pid.toString(), "/f", "/t"],
    });
    return await kill.output();
  }

  process.kill(signal);
  await process.status;
}
