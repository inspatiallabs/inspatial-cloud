export class InPgConn implements Deno.Conn<Deno.NetAddr> {
  #socket?: WebSocket;
  #stop: boolean = false;
  #dataBuffer: Uint8Array = new Uint8Array(0);
  ready: Promise<void> = Promise.resolve();
  resolve: () => void = () => {};

  localAddr: Deno.NetAddr = {
    transport: "tcp",
    hostname: "",
    port: 0,
  };
  remoteAddr: Deno.NetAddr;
  constructor(config: { hostname: string; port: number }) {
    this.writable = new WritableStream();
    this.readable = new ReadableStream();
    this.remoteAddr = {
      transport: "tcp",
      hostname: config.hostname,
      port: config.port,
    };
  }
  get closed(): boolean {
    if (!this.#socket) {
      return true;
    }

    return this.#socket.readyState === WebSocket.CLOSED;
  }
  get connected(): boolean {
    return this.#socket?.readyState === WebSocket.OPEN;
  }
  get closing(): boolean {
    return this.#socket?.readyState === WebSocket.CLOSING;
  }

  get connecting(): boolean {
    return this.#socket?.readyState === WebSocket.CONNECTING;
  }

  async connect() {
    await this.#reconnect();
  }
  stop() {
    this.#stop = true;
    this.#socket?.close();
  }
  async #reconnect() {
    while (this.closed) {
      if (this.connected || this.#stop) {
        break;
      }
      await this.#connect();

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  async #connect() {
    this.busy();
    const socket = new WebSocket(
      `ws://${this.remoteAddr.hostname}:${this.remoteAddr.port}/ws`,
    );
    return new Promise<void>((resolve, reject) => {
      this.#socket = socket;
      socket.onopen = () => {
        this.done();
        resolve();
      };
      socket.onmessage = async (event: MessageEvent<Blob>) => {
        const arrayBuffer = await event.data.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        this.#dataBuffer = new Uint8Array([...this.#dataBuffer, ...bytes]);
        this.done();
      };
      socket.onclose = () => {
        this.#socket = undefined;
        resolve();
      };
      socket.onerror = (error) => {
        this.#socket = undefined;
        resolve();
      };
    });
  }
  async read(p: Uint8Array): Promise<number | null> {
    await this.ready;
    this.busy();
    if (this.#dataBuffer.length === 0) {
      this.done();
      return null;
    }
    const length = p.byteLength;
    const availableDataLength = this.#dataBuffer.byteLength;
    const gotData = this.#dataBuffer.slice(
      0,
      length < availableDataLength ? length : availableDataLength,
    );
    p.set(gotData, 0);
    this.#dataBuffer = this.#dataBuffer.slice(gotData.byteLength);
    this.done();
    return gotData.byteLength;
  }
  async write(bytes: Uint8Array): Promise<number> {
    await this.ready;
    this.busy();
    this.#socket?.send(bytes);
    return bytes.length;
  }
  busy() {
    this.ready = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
  done() {
    this.resolve();
  }

  close(): void {
    throw new Error("Method not implemented.");
  }

  closeWrite(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  ref(): void {
    throw new Error("Method not implemented.");
  }
  unref(): void {
    throw new Error("Method not implemented.");
  }
  readable: ReadableStream<Uint8Array<ArrayBuffer>>;
  writable: WritableStream<Uint8Array<ArrayBufferLike>>;
  [Symbol.dispose](): void {
    throw new Error("Method not implemented.");
  }
}
