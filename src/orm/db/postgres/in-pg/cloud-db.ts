import { inLog } from "../../../../in-log/in-log.ts";
import { InPG } from "./in-pg.ts";

export class CloudDB {
  inPg: InPG;

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

  async start(
    port: number,
    statusCallback?: (status: "starting" | "running") => void,
  ) {
    if (statusCallback) {
      statusCallback("starting");
    }
    await this.inPg.run();
    Deno.serve({
      hostname: "127.0.0.1",
      port,
      onListen: (addr) => {
        if (statusCallback) {
          statusCallback("running");
        }
      },
    }, async (request) => {
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
      });
      socket.addEventListener("error", (error) => {
      });
      return response;
    });
  }
}
