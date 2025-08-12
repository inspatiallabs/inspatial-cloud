import { BrokerClient } from "~/in-live/broker-client.ts";

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

  channel: BrokerClient<CacheMessage>;
  constructor() {
    this.#cache = new Map();
    this.channel = new BrokerClient<CacheMessage>("inCache");
    this.#setupChannel();
  }
  init(brokerPort: number): void {
    this.channel.connect(brokerPort);
  }
  getValue<T = any>(namespace: string, key: string): T | undefined {
    const cache = this.#cache.get(namespace);
    if (!cache) {
      return undefined;
    }
    return cache.get(key);
  }

  setValue(namespace: string, key: string, value: unknown): void {
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
    this.channel.broadcast(message);
  }

  #setupChannel(): void {
    this.channel.onMessageReceived((message) => {
      switch (message.type) {
        case "setValue": {
          this.#setValue(
            message.namespace,
            message.key,
            message.value,
          );
          break;
        }
        case "deleteValue":
          this.#deleteValue(message.namespace, message.key);
          break;

        case "clearNamespace":
          this.#clear(message.namespace);
          break;

        case "clearAll":
          this.#clearAll();
          break;
      }
    });
  }
}
