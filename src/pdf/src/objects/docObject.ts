import type { ContentStream } from "../graphics/contentStream.ts";
import type { ImageStream } from "../graphics/imageStream.ts";
import { Dictionary } from "./dictionary.ts";

export class DocObject extends Dictionary {
  name?: string;
  byteOffset: number;
  inUse: boolean;
  objNumber: number;
  genNumber: number = 0;
  #stream?: ContentStream;
  #generateBytes?: () => Uint8Array;
  constructor(args: {
    name?: string;
    objNumber: number;
  }) {
    super();
    const { name, objNumber } = args;
    this.name = name;
    this.objNumber = objNumber;
    this.byteOffset = 0;
    this.inUse = true;
  }
  setCustomByteGenerator(generator: () => Uint8Array) {
    this.#generateBytes = generator;
  }
  addContentStream(stream: ContentStream) {
    this.#stream = stream;
  }

  generateTableEntry(): Uint8Array {
    const data = `${this.byteOffset.toString().padStart(10, "0")} ${
      this.genNumber.toString().padStart(5, "0")
    } ${this.inUse ? "n" : "f"}\r\n`;
    return new TextEncoder().encode(data);
  }
  generateBytes(): Uint8Array {
    if (this.#generateBytes) {
      return this.#generateBytes();
    }
    const encoder = new TextEncoder();
    let bytes = new Uint8Array(0);
    if (this.#stream) {
      const { bytes: streamData, length } = this.#stream.generate();
      bytes = new Uint8Array([...streamData]);
      this.set("Length", length);
    }

    const content = this.generate();
    const ref = `${this.objNumber} 0 obj`;
    const data = encoder.encode(`${ref}\r\n${content}\r\n`);

    return new Uint8Array([...data, ...bytes, ...encoder.encode("endobj\r\n")]);
  }
}
