import type { CloudConfig } from "#types/mod.ts";
import { InCloud } from "~/in-cloud.ts";
import { requestHandler } from "~/serve/request-handler.ts";
import type {
  QueueImageOptimize,
  QueueStatus,
  QueueTaskStatus,
} from "../in-queue/types.ts";

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
  handleQueueStatus(message: QueueStatus) {
    const { status } = message;
    this.inLive.notify({
      roomName: "globalTaskQueue",
      event: "status",
      data: { status },
    });
  }

  handleQueueTaskMessage(message: QueueTaskStatus | QueueImageOptimize) {
    const accountId = message.global ? undefined : message.accountId;
    const roomName = message.global ? "globalTaskQueue" : "accountTaskQueue";
    this.inLive.notify({
      accountId,
      roomName,
      event: message.type,
      data: {
        ...message,
        accountId,
      },
    });
  }
  override async run() {
    await super.run();
    this.inQueue.onMessageReceived((message) => {
      switch (message.type) {
        case "status":
          this.handleQueueStatus(message);
          break;
        case "taskStatus":
        case "optimizeImage":
          this.handleQueueTaskMessage(message);
          break;
        default:
          return;
      }
      this.inLog.debug(message, {
        compact: true,
        subject: "Queue Message",
      });
    });
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
