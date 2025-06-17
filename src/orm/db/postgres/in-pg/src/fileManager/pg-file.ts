import { ni } from "../../in-pg.ts";
import type { PGMem } from "../pgMem.ts";

export class MemFile implements Deno.FsFile {
  #pgMem: PGMem;
  #content?: Int8Array;
  #data: Uint8Array;
  pos: number;
  length?: number;
  type?: string;
  statInfo = {
    isFile: true,
    size: 0,
    dev: 0,
  } as Deno.FileInfo;
  debug: boolean;
  readable: ReadableStream<Uint8Array<ArrayBuffer>>;
  writable: WritableStream<Uint8Array<ArrayBufferLike>>;
  get dataText(): string {
    return new TextDecoder().decode(this.#data);
  }
  constructor(pgMem: PGMem, type?: string, debug?: boolean) {
    this.readable = new ReadableStream();
    this.writable = new WritableStream();
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

  write(p: Uint8Array): Promise<number> {
    throw new Error("Method not implemented.");
  }
  truncate(len?: number): Promise<void> {
    throw new Error("Method not implemented.");
  }
  read(p: Uint8Array): Promise<number | null> {
    throw new Error("Method not implemented.");
  }
  seek(offset: number | bigint, whence: Deno.SeekMode): Promise<number> {
    throw new Error("Method not implemented.");
  }
  seekSync(offset: number, whence: Deno.SeekMode): number {
    switch (whence) {
      case Deno.SeekMode.Start:
        this.pos = offset;
      case Deno.SeekMode.Current:
        this.pos += offset;
      case Deno.SeekMode.End:
        this.pos = this.#data.length + offset;
    }
    return this.pos;
  }
  stat(): Promise<Deno.FileInfo> {
    throw new Error("Method not implemented.");
  }
  sync(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  syncSync(): void {
    throw new Error("Method not implemented.");
  }
  syncData(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  syncDataSync(): void {
    throw new Error("Method not implemented.");
  }
  utime(atime: number | Date, mtime: number | Date): Promise<void> {
    throw new Error("Method not implemented.");
  }
  utimeSync(atime: number | Date, mtime: number | Date): void {
    throw new Error("Method not implemented.");
  }
  isTerminal(): boolean {
    throw new Error("Method not implemented.");
  }
  setRaw(mode: boolean, options?: Deno.SetRawOptions): void {
    throw new Error("Method not implemented.");
  }
  lock(exclusive?: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }
  lockSync(exclusive?: boolean): void {
    throw new Error("Method not implemented.");
  }
  unlock(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  unlockSync(): void {
    throw new Error("Method not implemented.");
  }
  close(): void {
    throw new Error("Method not implemented.");
  }
  [Symbol.dispose](): void {
    throw new Error("Method not implemented.");
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
  }
  statSync(): Deno.FileInfo {
    return this.statInfo;
  }
}
export class PostgresFile implements Deno.FsFile {
  readable!: ReadableStream<Uint8Array<ArrayBuffer>>;
  writable!: WritableStream<Uint8Array<ArrayBufferLike>>;
  #data: Uint8Array;
  position: number = 0;
  statInfo = {
    isFile: true,
    isDirectory: false,
    isSymlink: false,
    size: 953268,
    dev: 66311,
    ino: 60954743,
    mode: 33188,
    nlink: 1,
    uid: 1000,
    gid: 1000,
    rdev: 0,
    blksize: 4096,
    blocks: 1864,
    isBlockDevice: false,
    isCharDevice: false,
    isFifo: false,
    isSocket: false,
  } as Deno.FileInfo;
  constructor(data: Uint8Array) {
    this.#data = data;
    this.statInfo.birthtime = new Date();
    this.statInfo.mtime = new Date();
    this.statInfo.atime = new Date();
    this.statInfo.ctime = new Date();
    this.statInfo.size = data.length;
    this.statInfo.blocks = Math.ceil(data.length / 4096);
  }

  readSync(p: Uint8Array): number | null {
    const offset = this.position + p.length;
    if (this.position >= this.#data.length) {
      return null;
    }
    if (offset <= this.#data.length) {
      p.set([...this.#data.slice(this.position, offset)]);
      this.position += p.length;
      return p.length;
    }
    if (offset > this.#data.length) {
      const data = this.#data.slice(this.position);
      this.position += data.length;
      p.set([...data]);
      return data.length;
    }

    ni("pgfile");
    return null;
  }

  seekSync(offset: number, whence: Deno.SeekMode): number {
    switch (whence) {
      case Deno.SeekMode.Start:
        this.position = offset;
      case Deno.SeekMode.Current:
        this.position += offset;
      case Deno.SeekMode.End:
        this.position = this.#data.length + offset;
    }
    return this.position;
  }
  statSync(): Deno.FileInfo {
    return this.statInfo;
  }
  seek(offset: number | bigint, whence: Deno.SeekMode): Promise<number> {
    throw new Error("Method not implemented.");
  }
  stat(): Promise<Deno.FileInfo> {
    throw new Error("Method not implemented.");
  }
  write(p: Uint8Array): Promise<number> {
    throw new Error("Method not implemented.");
  }
  writeSync(p: Uint8Array): number {
    throw new Error("Method not implemented.");
  }
  truncate(len?: number): Promise<void> {
    throw new Error("Method not implemented.");
  }
  truncateSync(len?: number): void {
    throw new Error("Method not implemented.");
  }
  read(p: Uint8Array): Promise<number | null> {
    throw new Error("Method not implemented.");
  }
  sync(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  syncSync(): void {
    throw new Error("Method not implemented.");
  }
  syncData(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  syncDataSync(): void {
    throw new Error("Method not implemented.");
  }
  utime(atime: number | Date, mtime: number | Date): Promise<void> {
    throw new Error("Method not implemented.");
  }
  utimeSync(atime: number | Date, mtime: number | Date): void {
    throw new Error("Method not implemented.");
  }
  isTerminal(): boolean {
    throw new Error("Method not implemented.");
  }
  setRaw(mode: boolean, options?: Deno.SetRawOptions): void {
    throw new Error("Method not implemented.");
  }
  lock(exclusive?: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }
  lockSync(exclusive?: boolean): void {
    throw new Error("Method not implemented.");
  }
  unlock(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  unlockSync(): void {
    throw new Error("Method not implemented.");
  }
  close(): void {
    this.position = 0;
  }
  [Symbol.dispose](): void {
    throw new Error("Method not implemented.");
  }
}
