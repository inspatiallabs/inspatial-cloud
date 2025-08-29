import { IS_WINDOWS } from "../../../../utils/path-utils.ts";
import { InPG } from "./in-pg.ts";

export class CloudDB {
  inPg: InPG;
  shuttingDown: boolean = false;
  server: Deno.HttpServer | undefined;
  constructor(pgDataRoot: string) {
    this.inPg = new InPG({
      env: {
        PGDATA: pgDataRoot,
        MODE: "REACT",
        PGDATABASE: "template1",
        PGUSER: "postgres",
        PREFIX: `/tmp/pglite`,
        REPL: "N",
      },
      onStderr: (out) => {
        console.log(out.message);
      },
      onStdout: (out) => {
        console.log(out.message);
      },
      debug: false,
      args: [
        "--locale",
        "en_US.UTF-8",
        "--single",
        "postgres",
        "--",
        `PGDATA=${pgDataRoot}`,
        `PREFIX=/tmp/pglite`,
        "PGDATABASE=template1",
        `PGUSER=postgres`,
        "REPL=N",
      ],
    });
  }
  async shutdown() {
    if (this.shuttingDown) {
      return;
    }
    this.shuttingDown = true;
    await this.server?.shutdown();
    await this.server?.finished;
    Deno.exit(0);
  }
  setupSignals() {
    Deno.addSignalListener("SIGINT", async () => {
      await this.shutdown();
    });
    if (IS_WINDOWS) {
      return;
    }
    Deno.addSignalListener("SIGTERM", async () => {
      await this.shutdown();
    });
  }
  async start(
    port: number,
    statusCallback?: (status: "starting" | "running") => void,
  ) {
    this.setupSignals();
    if (statusCallback) {
      statusCallback("starting");
    }
    await this.inPg.run();
    this.server = Deno.serve({
      hostname: "127.0.0.1",
      port,
      onListen: (_addr) => {
        if (statusCallback) {
          statusCallback("running");
        }
      },
    }, (request) => {
      const { response, socket } = Deno.upgradeWebSocket(request);
      socket.addEventListener("open", () => {
      });
      socket.addEventListener(
        "message",
        (event: MessageEvent<ArrayBuffer>) => {
          const response = this.inPg.sendQuery(new Uint8Array(event.data));
          socket.send(response);
        },
      );
      socket.addEventListener("close", () => {
        // no-op
      });
      socket.addEventListener("error", (_error) => {
        // should add error handling here?
      });
      return response;
    });
  }
}
