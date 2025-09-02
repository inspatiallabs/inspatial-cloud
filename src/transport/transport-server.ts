import cert from "./cert/localhost.crt" with { type: "text" };
import key from "./cert/localhost.key" with { type: "text" };

export class TransportServer {
  server: Deno.QuicEndpoint;
  listener!: Deno.QuicListener;
  constructor() {
    this.server = new Deno.QuicEndpoint({
      hostname: "localhost",
      port: 8050,
    });
  }

  async start() {
    this.listener = this.server.listen({
      alpnProtocols: ["h3"],
      cert,
      key,
    });
    while (true) {
      const connection = await this.listener.accept();

      const wt = await Deno.upgradeWebTransport(connection);
      this.handleWebTransport(wt);
    }
  }

  async handleWebTransport(wt: WebTransport) {
    await wt.ready;
    console.log("WebTransport connection established");
    const bidirectionalStream = await wt.createBidirectionalStream();

    const reader = bidirectionalStream.readable.getReader();
    const writer = bidirectionalStream.writable.getWriter();
    this.handleReader(reader);
    this.handleWriter(writer);
  }

  async handleReader(
    reader: ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>>,
  ) {
    while (true) {
      try {
        const { value, done } = await reader.read();
        if (done) break;
        console.log(value);
      } catch (error) {
        console.log(error);
        break;
      }
    }
  }

  async handleWriter(writer: WebTransportWriter) {
    await writer.ready;
    setInterval(async () => {
      await writer.write(new TextEncoder().encode("Hello, World!"));
    }, 1000);
  }
}
