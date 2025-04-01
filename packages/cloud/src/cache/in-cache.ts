import cloudLogger from "#/cloud-logger.ts";

interface CacheMessageBase {
  type: "setValue" | "deleteValue" | "clearNamespace" | "clearAll";
}

interface CacheMessageSet extends CacheMessageBase {
  type: "setValue";
  namespace: string;
  key: string;
  value: any;
}
interface CacheMessageClear extends CacheMessageBase {
  type: "clearNamespace";
  namespace: string;
}

interface CacheMessageClearAll extends CacheMessageBase {
  type: "clearAll";
}
interface CacheMessageDelete extends CacheMessageBase {
  type: "deleteValue";
  namespace: string;
  key: string;
}

type CacheMessage =
  | CacheMessageSet
  | CacheMessageClear
  | CacheMessageClearAll
  | CacheMessageDelete;
export class InCache {
  #cache: Map<string, Map<string, any>>;

  channel: BroadcastChannel;
  constructor() {
    this.#cache = new Map();
    this.channel = new BroadcastChannel("inCache");
    this.#setupChannel();
  }
  getValue(namespace: string, key: string): any {
    const cache = this.#cache.get(namespace);
    if (!cache) {
      return undefined;
    }
    return cache.get(key);
  }

  setValue(namespace: string, key: string, value: any): void {
    this.#setValue(namespace, key, value);
    this.#broadcast({
      type: "setValue",
      namespace,
      key,
      value,
    });
  }

  getList(namespace: string): Array<{ key: string; value: any }> {
    const cache = this.#cache.get(namespace);
    if (!cache) {
      return [];
    }
    return Array.from(cache.entries()).map(([key, value]) => ({ key, value }));
  }

  deleteValue(namespace: string, key: string): void {
    this.#deleteValue(namespace, key);
    this.#broadcast({
      type: "deleteValue",
      namespace,
      key,
    });
  }
  clear(namespace: string): void {
    this.#clear(namespace);
    this.#broadcast({
      type: "clearNamespace",
      namespace,
    });
  }
  clearAll(): void {
    this.#clearAll();
    this.#broadcast({
      type: "clearAll",
    });
  }

  #deleteValue(namespace: string, key: string): void {
    const cache = this.#cache.get(namespace);
    if (!cache) {
      return;
    }
    cache.delete(key);
  }
  #setValue(
    namespace: string,
    key: string,
    value: any,
  ): void {
    const cache = this.#cache.get(namespace);
    if (!cache) {
      this.#cache.set(namespace, new Map());
    }
    this.#cache.get(namespace)?.set(key, value);
  }
  #clear(namespace: string): void {
    this.#cache.delete(namespace);
  }

  #clearAll(): void {
    this.#cache.clear();
  }
  #broadcast(message: CacheMessage): void {
    this.channel.postMessage(message);
  }

  #setupChannel(): void {
    this.channel.onmessage = (event: MessageEvent<CacheMessage>) => {
      const { data } = event;
      switch (data.type) {
        case "setValue": {
          this.#setValue(
            data.namespace,
            data.key,
            data.value,
          );
          break;
        }
        case "deleteValue":
          this.#deleteValue(data.namespace, data.key);
          break;

        case "clearNamespace":
          this.#clear(data.namespace);
          break;

        case "clearAll":
          this.#clearAll();
          break;
      }
    };
  }
}
