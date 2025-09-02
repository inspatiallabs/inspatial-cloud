import { decodeBase64 } from "jsr:@std/encoding/base64";
import cert from "./cert/localhost.crt" with { type: "text" };
export class TransportClient {
  constructor() {
  }

  async init(args: { port: number; host?: string }) {
    const { port, host = "localhost" } = args;
    const url = `https://${host}:${port}/`;
    const certHash = await crypto.subtle.digest(
      "SHA-256",
      decodeBase64(cert.split("\n").slice(1, -2).join("")),
    );
    const transport = new WebTransport(url, {
      serverCertificateHashes: [{
        algorithm: "sha-256",
        value: certHash,
      }],
    });
    await transport.ready;
    console.log("WebTransport connection established");
    const bidirectionalStream = await transport.createBidirectionalStream();

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
        console.log("received", value);
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
