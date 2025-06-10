import { normalizePath } from "./src/convert.ts";
import { FileManager } from "./src/in-pg-files.ts";
import { PGMem } from "./src/pgMem.ts";
import { SysCalls } from "./src/syscalls.ts";
import { WasmLoader } from "./src/wasmLoader.ts";

export class InPG implements Deno.Conn {
  pgMem: PGMem;
  wasmLoader;
  runtimeInitialized;
  #bufferData: Uint8Array;
  #env;
  readEmAsmArgsArray: Array<number | bigint>;
  FD_BUFFER_MAX?: number;
  is_worker: boolean = false;
  sysCalls: SysCalls;
  asmCodes: Record<number, Function>;
  fileManager: FileManager;
  debug?: boolean;
  get env() {
    const envs = [];
    for (const [key, value] of Object.entries(this.#env)) {
      envs.push(`${key}=${value}`);
    }
    return envs;
  }
  constructor(wasmPath: string, options: Record<string, any>) {
    this.#env = options;
    this.debug = options?.debug;
    this.#bufferData = new Uint8Array(0);
    this.runtimeInitialized = false;
    this.pgMem = new PGMem(this);
    this.wasmLoader = new WasmLoader(this, wasmPath);
    this.readEmAsmArgsArray = [];
    this.fileManager = new FileManager(this, {
      debug: options?.debug,
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
    return;
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
    this.#callMain();

    const idb = this.initDB();
    console.log({ idb });
    if (!idb) {
      console.error("FATAL: INITDB failed to return value");
      return;
    }

    if (idb & 0b0001) {
      console.error("INITDB failed");
      return;
    }

    if (idb & 0b0010) {
      console.log(" #1 initdb was called");
      if (idb & 0b0100) {
        console.log(" #2 found db");

        if (idb & (0b0100 | 0b1000)) {
          console.log(" #3 found db+user : switch user");
          // switch role
          // vm.readline("SET ROLE ${PGUSER};");
        }
        console.error("Invalid user ?");
      } else {
        console.warn(" TODO:  create db+user here / callback / throw ");
      }
    }
    this.initBackend();
    Deno.exit(1);
  }
  async shutdown() {
    for (const [fd, file] of this.fileManager.openFiles.entries()) {
      if (file.isMem) {
        continue;
      }
      file.file.close();
    }
    this.fileManager.openFiles.clear();
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
    entryFunction(argc, argv);
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
export function ni(message?: string) {
  console.log(message || "not implemented");
  Deno.exit(1);
}
