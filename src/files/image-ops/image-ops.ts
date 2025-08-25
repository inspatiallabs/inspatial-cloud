import ulid from "../../orm/utils/ulid.ts";
import type {
  ErrorResult,
  ImageMessage,
  ImageMessageResult,
  ImageMessageResultEvent,
  ImageOperation,
  OptimizeImageMessage,
  OptimizeImageResult,
  ResizeThumbnailMessage,
  ThumbnailImageResult,
} from "./image-types.ts";

export class ImageOps {
  #worker: Worker;
  #callbacks: Map<string, (result: ImageMessageResult) => void> = new Map();
  constructor() {
    this.#worker = new Worker(
      import.meta.resolve("./resize-worker.ts"),
      { type: "module" },
    );
  }
  async optimizeImage(
    options: Omit<OptimizeImageMessage, "id">,
  ): Promise<OptimizeImageResult | ErrorResult> {
    let resolveFn: (
      value: OptimizeImageResult,
    ) => void;
    const promise = new Promise<OptimizeImageResult | ErrorResult>(
      (resolve) => {
        resolveFn = resolve;
      },
    );
    this.#sendMessage("optimize", options, (result) => {
      resolveFn(result);
    });
    return await promise;
  }
  async generateThumbnail(
    options: Omit<ResizeThumbnailMessage, "id">,
  ): Promise<ThumbnailImageResult | ErrorResult> {
    let resolveFn: (
      value: ThumbnailImageResult,
    ) => void;
    const promise = new Promise<ThumbnailImageResult | ErrorResult>(
      (resolve) => {
        resolveFn = resolve;
      },
    );
    this.#sendMessage("thumbnail", options, (result) => {
      resolveFn(result);
    });
    return await promise;
  }
  init() {
    this.#worker.onerror = (e) => {
      console.error("Worker error:", e.message);
    };
    this.#addMessageListener();
    this.#sendMessage("init", {});
  }
  #addMessageListener() {
    this.#worker.onmessage = ({ data }: ImageMessageResultEvent) => {
      const id = data.id;
      const callback = this.#callbacks.get(id);
      if (callback) {
        callback(data);
        this.#callbacks.delete(id);
        return;
      }
    };
  }
  #registerCallback(
    id: string,
    callback: (result: any) => void,
  ) {
    this.#callbacks.set(id, callback);
  }
  #sendMessage<
    K extends ImageOperation,
  >(
    command: K,
    msg: Omit<Omit<Extract<ImageMessage, { command: K }>, "id">, "command">,
    callback?: (result: Extract<ImageMessageResult, { command: K }>) => void,
  ) {
    const id = ulid();
    const message = { id, command, ...msg };
    if (callback) {
      this.#registerCallback(id, callback);
    }
    this.#worker.postMessage(message);
  }
}
