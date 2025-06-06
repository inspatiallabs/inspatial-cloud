import type { PostgresFactory, PostgresMod } from "./in-pg-types.ts";
import pg from "./pglite.js";
const PGDATA = "/tmp/pglite/base";
const WASM_PREFIX = "/tmp/pglite";

const basePath = import.meta.dirname;
// const pgServer = await pgFactory(vars);
// const initDB = pgServer._pgl_initdb();
// console.log({ initDB });
// pgServer._pgl_backend();
// pgServer._interactive_one();

// Object.keys(pgServer).forEach((key) => {
//   if (key.startsWith("_pg")) {
//     console.log(key);
//     return;
//   }
//   if (key.startsWith("_")) return;
//   console.log(key);
// });
//

const message = new Uint8Array([
  81,
  0,
  0,
  0,
  22,
  83,
  69,
  76,
  69,
  67,
  84,
  32,
  118,
  101,
  114,
  115,
  105,
  111,
  110,
  40,
  41,
  59,
  0,
]);
// let data;
// // >0 set buffer content type to wire protocol
// pgServer._use_wire(1);
// const msg_len = message.length;

// pgServer._interactive_write(message.length);
// // TODO: make it seg num * seg maxsize if multiple channels.
// pgServer.HEAPU8.set(message, 1);

// // Use socketfiles to emulate a socket connection
// // const pg_lck = "/tmp/pglite/base/.s.PGSQL.5432.lck.in";
// // const pg_in = "/tmp/pglite/base/.s.PGSQL.5432.in";
// // pgServer._interactive_write(0);
// // pgServer.FS.writeFile(pg_lck, message);
// // pgServer.FS.rename(pg_lck, pg_in);

// // execute the message
// pgServer._interactive_one();

// const channel = pgServer._get_channel();
// console.log({ channel });

// const msg_start = msg_len + 2;
// const msg_end = msg_start + pgServer._interactive_read();
// data = pgServer.HEAPU8.subarray(msg_start, msg_end);

// // const pg_out = "/tmp/pglite/base/.s.PGSQL.5432.out";

// // try {
// //   const fstat = pgServer.FS.stat(pg_out);
// //   const stream = pgServer.FS.open(pg_out, "r");
// //   data = new Uint8Array(fstat.size);
// //   pgServer.FS.read(stream, data, 0, fstat.size, 0);
// //   pgServer.FS.unlink(pg_out);
// // } catch (x) {
// //   // case of single X message.
// //   data = new Uint8Array(0);
// // }

// console.log({ data });

// const stringData = new TextDecoder().decode(data);
// console.log(stringData);

export class InPg implements Deno.Conn {
  #pgMod?: PostgresMod;
  #data?: Uint8Array<ArrayBuffer>;
  #opts: Partial<PostgresMod>;
  #database: string;
  #bufferData: Uint8Array;

  constructor() {
    this.#bufferData = new Uint8Array();
    this.#database = "postgres";
    this.#opts = {
      WASM_PREFIX,

      preRun: [(e) => {
        console.log("prerun(js)", PGDATA);
      }],
      noExitRuntime: true,
      logReadFiles: false,
      locateFile: (filename: string, rootPath: string) => {
        const filePath = `${rootPath}${filename}`;
        console.log(filePath);
        return filePath;
      },
    };
  }

  async init(options?: {
    database?: string;
  }): Promise<void> {
    this.#database = options?.database || "postgres";
    this.#opts.arguments = [
      `PGDATA=${PGDATA}`,
      `PREFIX=${WASM_PREFIX}`,
      `PGUSER=postgres`,
      `PGDATABASE=${this.#database}`,
      "MODE=REACT",
      "REPL=N",
    ], this.#opts.print = this.#print.bind(this);
    this.#opts.printErr = this.#printErr.bind(this);
    this.#loadWasmModule();
    this.#loadData();
    this.#opts.getPreloadedPackage = (fileName, fileSize) => {
      if (fileName != "pglite.data") {
        throw new Error(`${fileName} in get preload`);
      }
      const data = this.#data!;
      if (data.byteLength != fileSize) {
        throw new Error(
          `${fileSize} is not = ${data.byteLength} in get preload`,
        );
      }
      return data.buffer;
    }, this.#pgMod = await pg(this.#opts);
    const initDB = this.#pgMod!._pgl_initdb();
    console.log({ initDB });
    this.#pgMod!._pgl_backend();
  }
  #loadWasmModule() {
    this.#opts.wasmBinary = Deno.readFileSync(`${basePath}/pglite.wasm`).buffer;
  }
  #loadData() {
    this.#data = Deno.readFileSync(`${basePath}/pglite.data`);
  }

  write(message: Uint8Array): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const mod = this.#pgMod!;
      // >0 set buffer content type to wire protocol
      mod._use_wire(1);
      const msg_len = message.length;

      msg_len;

      mod._interactive_write(message.length);
      // TODO: make it seg num * seg maxsize if multiple channels.
      mod.HEAPU8.set(message, 1);

      // Use socketfiles to emulate a socket connection
      // const pg_lck = "/tmp/pglite/base/.s.PGSQL.5432.lck.in";
      // const pg_in = "/tmp/pglite/base/.s.PGSQL.5432.in";
      // pgServer._interactive_write(0);
      // pgServer.FS.writeFile(pg_lck, message);
      // pgServer.FS.rename(pg_lck, pg_in);

      // execute the message
      mod._interactive_one();

      const channel = mod._get_channel();

      const msg_start = msg_len + 2;
      const msg_end = msg_start + mod._interactive_read();
      const data = mod.HEAPU8.subarray(msg_start, msg_end);
      this.#bufferData = new Uint8Array([...this.#bufferData, ...data]);
      // const pg_out = "/tmp/pglite/base/.s.PGSQL.5432.out";

      // try {
      //   const fstat = pgServer.FS.stat(pg_out);
      //   const stream = pgServer.FS.open(pg_out, "r");
      //   data = new Uint8Array(fstat.size);
      //   pgServer.FS.read(stream, data, 0, fstat.size, 0);
      //   pgServer.FS.unlink(pg_out);
      // } catch (x) {
      //   // case of single X message.
      //   data = new Uint8Array(0);
      // }
      resolve(msg_len);
    });
  }
  #print(message: any) {
    console.log(`%c ${message}`, "background: #222; color: #55da55");
  }

  #printErr(error: any) {
    console.log(`%c ${error}`, "background: #222; color: #885511");
  }
  read(p: Uint8Array): Promise<number | null> {
    return new Promise<number | null>((resolve, reject) => {
      if (this.#bufferData.length === 0) {
        resolve(null);
      }
      const length = p.byteLength;
      const availableDataLength = this.#bufferData.byteLength;
      const gotData = this.#bufferData.slice(
        0,
        length < availableDataLength ? length : availableDataLength,
      );
      p.set(gotData, 0);
      this.#bufferData = this.#bufferData.slice(gotData.byteLength);

      resolve(gotData.byteLength);
    });
  }

  close(): void {
  }
  writable: WritableStream<Uint8Array<ArrayBufferLike>> = new WritableStream();
  closeWrite(): Promise<void> {
    return new Promise((r) => r());
  }
  readable: ReadableStream<Uint8Array<ArrayBuffer>> = new ReadableStream();
  unref(): void {
  }
  localAddr: any = null;
  remoteAddr: any = null;
  ref(): void {
  }
  [Symbol.dispose](): void {
    throw new Error("Method not implemented.");
  }
}
