import type { ClientMessageType } from "/orm/db/postgres/pgTypes.ts";

export class MessageWriter {
  buffer: Uint8Array;
  offset: number;
  size: number;
  messageType: ClientMessageType | undefined;
  encoder = new TextEncoder();

  constructor(messageType?: ClientMessageType) {
    this.size = 1024;
    this.offset = 5;

    this.buffer = new Uint8Array(this.size);
    this.setMessageType(messageType);
  }
  copy(src: Uint8Array, dst: Uint8Array, off = 0): number {
    off = Math.max(0, Math.min(off, dst.byteLength));
    const dstBytesAvailable = dst.byteLength - off;
    if (src.byteLength > dstBytesAvailable) {
      src = src.subarray(0, dstBytesAvailable);
    }
    dst.set(src, off);
    return src.byteLength;
  }
  encode(data: string): Uint8Array {
    return this.encoder.encode(data);
  }

  setMessageType(type?: ClientMessageType): void {
    this.messageType = type;
    if (this.messageType) {
      this.buffer[0] = this.encode(this.messageType)[0];
    } else {
      this.buffer[0] = 0;
    }
  }

  ensure(size: number): void {
    const remaining = this.buffer.length - this.offset;
    if (remaining < size) {
      const oldBuffer = this.buffer;
      // exponential growth factor of around ~ 1.5
      // https://stackoverflow.com/questions/2269063/#buffer-growth-strategy
      const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
      this.buffer = new Uint8Array(newSize);
      this.copy(oldBuffer, this.buffer);
    }
  }

  addCString(string?: string): MessageWriter {
    // just write a 0 for empty or null strings
    if (!string) {
      this.ensure(1);
    } else {
      const encodedStr = this.encode(string);
      this.ensure(encodedStr.byteLength + 1); // +1 for null terminator
      this.copy(encodedStr, this.buffer, this.offset);
      this.offset += encodedStr.byteLength;
    }

    this.buffer[this.offset++] = 0; // null terminator
    return this;
  }
  addString(string: string): MessageWriter {
    const encodedStr = this.encode(string);
    this.ensure(encodedStr.byteLength);
    this.copy(encodedStr, this.buffer, this.offset);
    this.offset += encodedStr.byteLength;

    return this;
  }

  addInt32(num: number): MessageWriter {
    this.ensure(4);
    this.buffer[this.offset++] = (num >>> 24) & 0xff;
    this.buffer[this.offset++] = (num >>> 16) & 0xff;
    this.buffer[this.offset++] = (num >>> 8) & 0xff;
    this.buffer[this.offset++] = (num >>> 0) & 0xff;
    return this;
  }

  addInt16(num: number): MessageWriter {
    this.ensure(2);
    this.buffer[this.offset++] = (num >>> 8) & 0xff;
    this.buffer[this.offset++] = (num >>> 0) & 0xff;
    return this;
  }

  setSize(): void {
    const size = this.offset - 1;
    const dataView = new DataView(this.buffer.buffer);
    dataView.setInt32(1, size, false);
  }

  addNegativeOne(): MessageWriter {
    this.ensure(4);
    this.buffer[this.offset++] = 255;
    this.buffer[this.offset++] = 255;
    this.buffer[this.offset++] = 255;
    this.buffer[this.offset++] = 255;
    return this;
  }

  get message(): Uint8Array {
    this.setSize();
    const withType = this.messageType ? 0 : 1;
    const data = this.buffer.slice(withType, this.offset);
    this.reset();
    return data;
  }

  reset(): void {
    this.offset = 5;
  }
}
