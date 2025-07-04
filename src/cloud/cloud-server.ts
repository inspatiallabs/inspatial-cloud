import type { CloudConfig } from "#types/mod.ts";
import { requestHandler } from "../app/request-handler.ts";
import { InCloud } from "./in-cloud.ts";
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
    const config = this.getExtensionConfig("cloud");

    return Deno.serve(
      {
        hostname: config.hostName,
        port: config.port,
        reusePort,
        onListen: (_addr) => {
          // Hide stdout message
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
