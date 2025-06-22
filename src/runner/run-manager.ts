import type { CloudConfig } from "#types/mod.ts";
import {
  generateConfigSchema,
  loadCloudConfigFile,
} from "../cloud-config/cloud-config.ts";
import { InCloud } from "../cloud/cloud-common.ts";
import { makeLogo } from "#terminal/logo.ts";
import { initCloud } from "../init.ts";
import ColorMe from "#terminal/color-me.ts";
import convertString from "#utils/convert-string.ts";
import { center } from "#terminal/format-utils.ts";
import { joinPath } from "#utils/path-utils.ts";
import { getCoreCount } from "./multicore.ts";
import type { RunnerMode } from "./types.ts";
import { TerminalView } from "#terminal/terminal-view.ts";
import { Terminal } from "#terminal/terminal.ts";
import { inLog } from "../in-log/in-log.ts";
import { asyncPause } from "#utils/misc.ts";
function spin(callback: (content: string) => void) {
  const spinnerChars = ["|", "/", "-", "\\", "|", "/", "-", "\\"];
  let index = 0;
  const interval = setInterval(() => {
    callback(spinnerChars[index]);
    index = (index + 1) % spinnerChars.length;
  }, 100);
  return () => clearInterval(interval);
}
const OFFSET = 26;
const terminalMessages = {
  broker: {
    row: 39,

    title: "Message Broker",
  },
  queue: {
    row: 40,
    title: "InQueue",
  },
  db: {
    row: 41,
    title: "Database",
  },
  server: {
    row: 42,
    title: "Server Processes",
  },
};
const STARTING = ColorMe.standard().content("Starting").color("brightYellow")
  .end();
const CONNECTING = ColorMe.standard().content("Connecting").color(
  "brightYellow",
).end();
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
  view: TerminalView;

  constructor(rootPath: string) {
    this.serveProcs = [];
    this.coreCount = 1;
    // Initialize the RunManager
    this.view = new TerminalView({
      title: "InSpatial Cloud",
    });
    this.rootPath = rootPath;
    this.appName = Deno.env.get("APP_NAME") || "InSpatial";
  }
  async init(appName: string, config: CloudConfig): Promise<void> {
    Terminal.hideCursor();
    this.view.start();
    Terminal.goTo(3, 0);
    this.view.printRaw(
      makeLogo({
        symbol: "alt2DownLeft",
        fillSymbol: "alt2UpRight",
        blankSymbol: "alt2DownRight",
        bgColor: "bgBlack",
        blankColor: "black",
        fillColor: "brightMagenta",
        outlineColor: "white",
      }),
    );
    this.setupMessages();

    Deno.args.forEach((arg) => {
      if (arg === "--watch") {
        this.watch = true;
      }
    });
    const stopBrokerSpin = spin((content) => {
      this.updateStatus("broker", {
        message: `${STARTING} ${content}`,
      });
    });
    const stopQueueSpin = spin((content) => {
      this.updateStatus("queue", {
        message: `${STARTING} ${content}`,
      });
    });
    const stopServerSpin = spin((content) => {
      this.updateStatus("server", {
        message: `${STARTING} ${content}`,
      });
    });

    this.coreCount = await getCoreCount();
    this.appName = appName;
    // environment variables setup
    const hasConfig = loadCloudConfigFile(this.rootPath);
    const inCloud = new InCloud(appName, config, "manager");

    inCloud.init();
    if (!hasConfig) {
      generateConfigSchema(inCloud);
      initCloud(inCloud);
    }
    const embeddedDb = inCloud.getExtensionConfigValue("orm", "embeddedDb");
    this.autoMigrate = inCloud.getExtensionConfigValue("orm", "autoMigrate");
    this.autoTypes = inCloud.getExtensionConfigValue("orm", "autoTypes");
    const ormConfig = inCloud.getExtensionConfig("orm");

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
    let stopDbSpin: () => void = () => {};
    let embeddedDbPort: number | undefined = undefined;
    if (!embeddedDb) {
      stopDbSpin = spin((content) => {
        this.updateStatus("db", {
          message: `${CONNECTING} ${
            makeDBConnectionString(ormConfig)
          } ${content}`,
        });
      });
    }
    if (embeddedDb) {
      stopDbSpin = spin((content) => {
        this.updateStatus("db", {
          message: `${STARTING} Embedded DB ${content}`,
        });
      });
      embeddedDbPort = inCloud.getExtensionConfigValue<number>(
        "orm",
        "embeddedDbPort",
      );
      this.spawnDB(embeddedDbPort);
    }
    this.spawnBroker(brokerPort);
    stopBrokerSpin();
    this.updateStatus(
      "broker",
      {
        message: makeRunning(true, brokerPort),
      },
    );
    await inCloud.boot();
    if (this.autoMigrate || this.autoTypes) {
      await this.spawnMigrator();
    }
    this.spawnQueue();

    const procCount = this.spawnServers();
    stopServerSpin();
    this.updateStatus("server", {
      message: `${makeRunning(true, this.port!)} (${procCount} instances)`,
    });
    stopDbSpin();
    if (!embeddedDb) {
      this.view.setRowContent(
        terminalMessages.db.row,
        ColorMe.standard().content(" ".repeat(6) + terminalMessages.db.title)
          .color(
            "brightBlue",
          ).end(),
      );

      this.updateStatus("db", {
        message: makeDBConnectionString(ormConfig, true),
      });
    }
    if (embeddedDb) {
      this.updateStatus("db", {
        message: makeRunning(true, embeddedDbPort!),
      });
    }

    stopQueueSpin();
    this.updateStatus("queue", {
      message: makeRunning(true, queuePort),
    });
    // this.printInfo(inCloud.inLog, [rows.map((row) => center(row)).join("\n")]);

    await asyncPause(100);

    const url = `http://${this.hostname}:${this.port}`;
    Terminal.goTo(44, 0);
    inLog.info(
      center(
        ColorMe.standard("basic").content(
          "InSpatial Cloud",
        ).color("brightMagenta")
          .content(" running at ")
          .color("brightWhite")
          .content(url)
          .color("brightCyan")
          .end(),
      ),
      convertString(this.appName, "title", true),
    );
    if (this.watch) {
      inLog.info(
        "Watching for file changes. Press Ctrl+C to stop.",
        convertString(this.appName, "title", true),
      );
      this.setupWatcher();
    }
    Terminal.showCursor();
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
  updateStatus(type: "broker" | "queue" | "db" | "server", options: {
    message: string;
  }) {
    const { row } = terminalMessages[type];
    const message = options.message;
    Terminal.goTo(row, OFFSET);
    Terminal.write(message);
  }
  setupMessages() {
    Object.entries(terminalMessages).forEach(([_key, value]) => {
      const content = ColorMe.standard().content(" ".repeat(6) + value.title)
        .color(
          "brightBlue",
        ).end();
      this.view.setRowContent(value.row, content);
    });
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

    process.status.then((status) => {
      const { success, code } = status;
      if (!success) {
        inLog.error(
          `Process ${mode} exited with code ${code}.`,
          convertString(this.appName, "title", true),
        );
      }
    });
    return process;
  }

  // printInfo(inLog: InLog, rows: Array<string> = []) {

  //   const url = `http://${this.hostname}:${this.port}`;

  //   const output = [
  //     logo,

  //     ...rows.map((row) => center(row)),
  //     center(
  //       "You can ping the server:",
  //     ),
  //     ColorMe.fromOptions(
  //       center(
  //         `http://${this.hostname}:${this.port}/api?group=api&action=ping`,
  //       ),
  //       {
  //         color: "brightYellow",
  //       },
  //     ),
  //   ];
  //   inLog.info(
  //     output.join("\n\n"),
  //     convertString(this.appName, "title", true),
  //   );
  // }
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
  isRunning: boolean,
  port: number | string = "unknown",
): string {
  const output = ColorMe.standard();
  if (isRunning) {
    return output.content("Running").color("brightGreen").content(" on port ")
      .color(
        "white",
      ).content(port.toString()).color("brightYellow").end();
  }
  return output.content("Not running").color("brightRed").end();
}
