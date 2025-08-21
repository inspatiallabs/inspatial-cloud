import type { CloudConfig } from "#types/mod.ts";
import { InCloud } from "~/in-cloud.ts";
import { requestHandler } from "~/serve/request-handler.ts";

export class InCloudServer extends InCloud {
  instanceNumber: string;
  server: Deno.HttpServer<Deno.NetAddr> | undefined;
  signal: AbortSignal | undefined;
  abortController: AbortController | undefined;
  constructor(
    appName: string,
    config: CloudConfig,
    instanceNumber?: string,
  ) {
    super(appName, config, "server");
    this.instanceNumber = instanceNumber || "_";
    this.abortController = new AbortController();
    this.signal = this.abortController.signal;
  }

  override async run() {
    await super.run();
    this.server = this.#serve();
    this.onShutdown(async () => {
      this.server?.shutdown();
      setTimeout(() => {
        if (this.server?.finished) {
          return;
        }
        this.abortController?.abort();
      }, 5000);
      await this.server?.finished;
    });
  }

  #serve(): Deno.HttpServer<Deno.NetAddr> {
    const reusePort = Deno.env.get("REUSE_PORT") === "true";
    const config = this.getExtensionConfig("core");

    return Deno.serve(
      {
        hostname: config.hostName,
        port: config.servePort,
        reusePort,
        signal: this.signal,
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
