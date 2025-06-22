import type { CloudConfig } from "#types/mod.ts";
import { requestHandler } from "../app/request-handler.ts";
import { InCloud } from "./cloud-common.ts";

export class InCloudServer extends InCloud {
  instanceNumber: string;
  constructor(
    appName: string,
    config: CloudConfig,
    instanceNumber?: string,
  ) {
    super(appName, config, "server");
    this.instanceNumber = instanceNumber || "_";
  }

  override async run() {
    await super.run();
    this.#serve();
  }

  #serve(): Deno.HttpServer<Deno.NetAddr> {
    const reusePort = Deno.env.get("REUSE_PORT") === "true";
    return Deno.serve(
      {
        // hostname: this.#config.hostname,
        // port: this.#config.port,
        reusePort,
        onListen: (localAddr) => {
        },
      },
      this.#requestHandler.bind(this),
    );
  }
  async #requestHandler(request: Request): Promise<Response> {
    return await requestHandler(
      request,
      this,
      this.extensionManager,
    );
  }
}
