import { ni } from "../in-pg.ts";
import type { PGMem } from "./pgMem.ts";

export class MemFile {
  #pgMem: PGMem;
  #content?: Int8Array;
  #data: Uint8Array;
  offset?: number;
  pos: number;
  length?: number;
  type?: string;
  statInfo = {
    isFile: true,
    size: 0,
    dev: 0,
  } as Deno.FileInfo;
  debug: boolean;
  constructor(pgMem: PGMem, type?: string, debug?: boolean) {
    this.debug = debug || false;
    this.type = type;
    this.#pgMem = pgMem;
    this.pos = 0;
    this.#data = new Uint8Array(0);
    this.statInfo.birthtime = new Date();
    this.statInfo.mtime = new Date();
    this.statInfo.atime = new Date();
    this.statInfo.ctime = new Date();
  }
  mmap(length: number, offset: number) {
    let ptr: number;
    let allocated: boolean = false;
    if (this.#content === undefined) {
      ptr = this.#pgMem.mmapAlloc(length);
      if (!ptr) {
        throw new Error("48");
      }
      allocated = true;
      this.#content = this.#pgMem.HEAP8.subarray(offset, offset + length);
      return { ptr, allocated };
    }
    ptr = this.#content.byteOffset;

    return {
      ptr,
      allocated,
    };
  }
  writeSync(bytes: Uint8Array): number {
    this.#data = new Uint8Array(bytes);
    this.statInfo.size = bytes.length;
    if (this.type === "tty" && this.debug) {
      console.log(
        new TextDecoder().decode(this.#data),
      );
    }
    return bytes.length;
  }
  truncateSync(len?: number): void {
    if (this.#content === undefined) {
      if (!len) {
        return;
      }
      const ptr = this.#pgMem.mmapAlloc(len);
      this.#content = this.#pgMem.HEAP8.subarray(ptr, ptr + len);
      return;
    }
    if (!len) {
      this.#content = undefined;
      return;
    }

    if (len === this.#content.length) {
      return;
    }
    if (len < this.#content.length) {
      const ptr = this.#content.byteOffset;
      this.#content = this.#content.subarray(ptr, len);
      return;
    }
    if (len > this.#content.length) {
      const ptr = this.#pgMem.mmapAlloc(len);
      this.#pgMem.HEAP8.set([...this.#content], ptr);
      this.#content = this.#pgMem.HEAP8.subarray(ptr, len);

      return;
    }

    throw new Error("Method not implemented.");
  }

  readSync(p: Uint8Array): number | null {
    switch (this.type) {
      case "urandom":
        crypto.getRandomValues(p);
        return p.length;
      case "tmp":
        break;
      default:
        throw new Error("Method not implemented.");
    }
    this.pos;
    const offset = this.pos + p.length;
    if (this.pos >= this.#data.length) {
      return null;
    }
    if (offset <= this.#data.length) {
      p.set([...this.#data.slice(this.pos, offset)]);
      this.pos += p.length;
    }
    if (offset > this.#data.length) {
      const data = this.#data.slice(this.pos);
      this.pos += data.length;
      p.set([...data]);
      return data.length;
    }

    ni();
    return null;
  }
  statSync(): Deno.FileInfo {
    return this.statInfo;
  }
}
