import type { CloudConfig } from "#types/mod.ts";
import { InCache } from "../app/cache/in-cache.ts";
import { requestHandler } from "../app/request-handler.ts";
import { InCloudCommon } from "./cloud-common.ts";

export class InCloudServer extends InCloudCommon {
  inCache: InCache;
  instanceNumber: string;
  constructor(
    appName: string,
    config: CloudConfig,
    instanceNumber?: string,
  ) {
    super(appName, config, "server");
    this.instanceNumber = instanceNumber || "_";
    this.inCache = new InCache();
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
