import { normalizePath } from "./src/convert.ts";
import { FileManager } from "./src/fileManager/in-pg-files.ts";
import { PGMem } from "./src/pgMem.ts";
import { SysCalls } from "./src/syscalls.ts";
import { ExitStatus } from "./src/utils.ts";
import { WasmLoader } from "./src/wasmLoader.ts";
import type { InPgOptions } from "./types.ts";

const fileData = Deno.readFileSync(import.meta.dirname + `/src/inpg.data`);
const wasmData = Deno.readFileSync(import.meta.dirname + `/src/inpg.wasm`);
export class InPG implements Deno.Conn {
  pgMem: PGMem;
  wasmLoader;
  runtimeInitialized;
  #bufferData: Uint8Array;
  #env;
  EXITSTATUS: number = 0;
  exceptionLast: number = 0;
  uncaughtExceptionCount: number = 0;
  args: Array<string> = [];
  initMemory: number = 16777216;
  ___heap_base: number = 15414848;
  __memory_base = new WebAssembly.Global(
    { value: "i32", mutable: false },
    12582912,
  );
  __stack_pointer = new WebAssembly.Global(
    { value: "i32", mutable: true },
    15414848,
  );
  tableSize: number = 5918;
  readEmAsmArgsArray: Array<number | bigint>;
  FD_BUFFER_MAX?: number;
  is_worker: boolean = false;
  sysCalls: SysCalls;
  asmCodes: Record<number, Function>;
  fileManager: FileManager;
  debug?: boolean;
  #onStdErr: (message: any) => void;
  #onStdOut: (message: any) => void;

  log(type: "out" | "err", chunk: Uint8Array) {
    if (!this.debug) {
      return;
    }
    const message = new TextDecoder().decode(chunk).trim();
    if (message === "") {
      return;
    }
    const match = message.match(
      /(?<date>^[\d-]+)\s(?<time>[\d:]+)\.\d{3}\s[\S]+\s\[\d\]\s(?<type>[A-Z]+):\s+(?<message>.*)/,
    );
    let out: Record<string, string> = {
      message,
    };
    if (match?.groups) {
      const { date, time, type, message } = match.groups;
      out = {
        date,
        time,
        type: type.trim(),
        message,
      };
    }

    switch (type) {
      case "err":
        this.#onStdErr(out);
        break;
      case "out":
        this.#onStdOut(out);
    }
  }
  get env() {
    const envs = [];
    for (const [key, value] of Object.entries(this.#env)) {
      envs.push(`${key}=${value}`);
    }
    return envs;
  }
  constructor(
    options: InPgOptions,
  ) {
    this.#onStdErr = options.onStderr || ((m) => console.error(m));
    this.#onStdOut = options.onStdout || ((m) => console.log(m));
    this.args = options.args;
    this.#env = options.env;
    this.debug = options?.debug;
    this.#bufferData = new Uint8Array(0);
    this.runtimeInitialized = false;
    this.pgMem = new PGMem(this);
    this.wasmLoader = new WasmLoader(this, wasmData);
    this.readEmAsmArgsArray = [];
    this.fileManager = new FileManager(this, {
      debug: options?.debug,
      fileData,
    });
    this.sysCalls = new SysCalls(this);

    this.asmCodes = {
      14963148: ($0: any) => {
      },
      14963320: () => {
      },
      14963449: () => {
      },
    };
  }

  async #setup() {
    this.pgMem.init();

    await this.wasmLoader.load();
  }
  sendQuery(message: Uint8Array) {
    this.wasmLoader.callExportFunction("use_wire", 1);
    const msg_len = message.length;

    this.wasmLoader.callExportFunction("interactive_write", message.length);
    this.pgMem.HEAPU8.set(message, 1);
    this.wasmLoader.callExportFunction("interactive_one");

    const channel = this.wasmLoader.callExportFunction("get_channel");

    const msg_start = msg_len + 2;
    const msg_end = msg_start +
      this.wasmLoader.callExportFunction("interactive_read");
    const data = this.pgMem.HEAPU8.subarray(msg_start, msg_end);
    return data;
  }
  async initRuntime() {
    this.runtimeInitialized = true;
    this.wasmLoader.callExportFunction("__wasm_apply_data_relocs");

    this.wasmLoader.callExportFunction("__wasm_call_ctors");
  }
  abort(what: string) {
    what = "Aborted(" + what + ")";
    console.error(what);
    what += ". Build with -sASSERTIONS for more info.";
    var e = new WebAssembly.RuntimeError(what);
    throw e;
  }

  async run() {
    await this.#setup();
    await this.initRuntime();
    this.#callMain(this.args);
    const idb = this.initDB();
    if (!idb) {
      // This would be a sab worker crash before pg_initdb can be called
      throw new Error("INITDB failed to return value");
    }

    // initdb states:
    // - populating pgdata
    // - reconnect a previous db
    // - found valid db+user
    // currently unhandled:
    // - db does not exist
    // - user is invalid for db
    //
    switch (idb) {
      case 2:
        // populating pgdata
        break;
      case 14:
        //found valid db+user
        break;
      default:
        throw new Error(`Bad initdb ${idb}`);
    }

    try {
      this.initBackend();
    } catch (e) {
      console.log(e);
      Deno.exit(1);
    }
  }

  initDB() {
    const result = this.wasmLoader.callExportFunction("pgl_initdb");
    return result;
  }
  initBackend() {
    const result = this.wasmLoader.callExportFunction("pgl_backend");
    return result;
  }
  #callMain(args: Array<string> = []) {
    const { sym, name } = this.wasmLoader.resolveGlobalSymbol("main");
    const entryFunction = sym as Function;

    if (!entryFunction) return;
    args.unshift(normalizePath(Deno.mainModule));
    const argc = args.length;
    const argv = this.pgMem.stackAlloc((argc + 1) * 4);
    let argv_ptr = argv;
    args.forEach((arg) => {
      this.pgMem.HEAPU32[argv_ptr >> 2] = this.pgMem.stringToUTF8OnStack(arg);
      argv_ptr += 4;
    });
    this.pgMem.HEAPU32[argv_ptr >> 2] = 0;
    try {
      const ret = entryFunction(argc, argv);
      this.exitJS(ret, true);
    } catch (e) {
      return this.handleException(e);
    }
  }
  getMemory(size: number) {
    if (this.runtimeInitialized) {
      return this.wasmLoader.callExportFunction("calloc", size, 1);
    }
    const ret = this.pgMem.___heap_base;
    const end = ret + this.pgMem.alignMemory(size, 16);
    this.pgMem.___heap_base = end;
    this.wasmLoader.GOT["__heap_base"].value = end;
    return ret;
  }
  exitJS(code: number, implicit?: boolean) {
    this.EXITSTATUS = code;

    throw new ExitStatus(code);
  }
  getExecutableName() {
    return Deno.mainModule;
  }

  runEmAsmFunction(code: number, sigPtr: number, argbuf: number) {
    const args = this.readEmAsmArgs(sigPtr, argbuf);

    const func = this.asmCodes[code];
    return func?.(...args);
  }
  readEmAsmArgs(sigPtr: number, buf: number) {
    this.readEmAsmArgsArray.length = 0;
    let ch: number;
    while ((ch = this.pgMem.HEAPU8[sigPtr++])) {
      let wide = ch != 105 ? 0 : 1;
      wide &= ch != 112 ? 0 : 1;
      buf += wide && buf % 8 ? 4 : 0;
      this.readEmAsmArgsArray.push(
        ch == 112
          ? this.pgMem.HEAPU32[buf >> 2]
          : ch == 106
          ? this.pgMem.HEAP64[buf >> 3]
          : ch == 105
          ? this.pgMem.HEAP32[buf >> 2]
          : this.pgMem.HEAPF64[buf >> 3],
      );
      buf += wide ? 8 : 4;
    }
    return this.readEmAsmArgsArray;
  }
  write(message: Uint8Array): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const msg_len = message.length;
      const data = this.sendQuery(message);

      this.#bufferData = new Uint8Array([...this.#bufferData, ...data]);

      resolve(msg_len);
    });
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
  handleException(e: unknown) {
    if (e instanceof ExitStatus || e == "unwind") {
      return this.EXITSTATUS;
    }
    throw e;
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
export function ni(message?: string): never {
  console.log(message || "not implemented");
  Deno.exit(1);
}
