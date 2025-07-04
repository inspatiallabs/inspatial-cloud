// import { setupInvokeImports } from "./setupInvokes.js";

import { type InPG, ni } from "../in-pg.ts";
import type { DLMetaData, DSO, WasmImports } from "../types.ts";
import { uleb128Encode, UTF8ArrayToString } from "./convert.ts";

import type { PGMem } from "./pgMem.ts";
import { setupInvokeImports } from "./setupInvokes.ts";
class LDSO {
  loadedLibsByName: Record<string, DSO>;
  loadedLibsByHandle: Record<string, DSO>;
  constructor() {
    this.loadedLibsByName = {};
    this.loadedLibsByHandle = {};
  }
  init(wasmImports: WasmImports) {
    this.newDSO("__main__", 0, wasmImports);
  }
  newDSO(name: string, handle?: number, syms?: WasmImports | string): DSO {
    const dso = { refcount: Infinity, name, exports: syms, global: true };
    this.loadedLibsByName[name] = dso;
    if (handle != undefined) {
      this.loadedLibsByHandle[handle] = dso;
    }
    return dso;
  }
}
export class WasmLoader {
  wasmImports: WasmImports;
  wasmTable;
  GOT: Record<string, any>;
  GOTHandler: any;
  currentModuleWeakSymbols = new Set<string>([]);
  LDSO;
  functionsInTableMap: WeakMap<any, any>;
  wasmExports: WebAssembly.Exports;
  freeTableIndexes: Array<number>;
  inPg: InPG;
  get pgMem(): PGMem {
    return this.inPg.pgMem;
  }
  constructor(inPg: InPG) {
    this.GOT = {};
    this.inPg = inPg;
    this.wasmExports = {};
    this.wasmImports = {};
    this.LDSO = new LDSO();
    this.functionsInTableMap = new WeakMap();
    this.freeTableIndexes = [];
    this.wasmTable = new WebAssembly.Table({
      initial: this.inPg.tableSize,
      element: "anyfunc",
    });

    const GOT = this.GOT;
    const currentModuleWeakSymbols = this.currentModuleWeakSymbols;
    this.GOTHandler = {
      get(_obj: object, symName: string) {
        let rtn = GOT[symName];
        if (!rtn) {
          rtn = GOT[symName] = new WebAssembly.Global({
            value: "i32",
            mutable: true,
          });
        }
        if (!currentModuleWeakSymbols.has(symName)) {
          rtn.required = true;
        }
        return rtn;
      },
    };
  }

  async load() {
    const GOTHandler = this.GOTHandler;
    this.setupImports();

    const wasmImports = this.wasmImports;

    const info: WebAssembly.Imports = {
      env: this.wasmImports as WebAssembly.ModuleImports,
      wasi_snapshot_preview1: wasmImports as WebAssembly.ModuleImports,
      "GOT.mem": new Proxy(
        wasmImports,
        GOTHandler,
      ) as WebAssembly.ModuleImports,
      "GOT.func": new Proxy(
        wasmImports,
        GOTHandler,
      ) as WebAssembly.ModuleImports,
    };

    const result = await WebAssembly.instantiate(this.inPg.wasmData, info);
    this.wasmExports = result.instance.exports;

    for (const [sym, exp] of Object.entries(result.instance.exports)) {
      const setImport = (target: string) => {
        if (!this.#isSymbolDefined(target)) {
          this.wasmImports[target] = exp;
        }
      };
      setImport(sym);
      const main_alias = "__main_argc_argv";
      if (sym == "main") {
        setImport(main_alias);
      }
      if (sym == main_alias) {
        setImport("main");
      }
    }

    this.#mergeLibSymbols(this.wasmExports);
    this.LDSO.init(this.wasmImports);
    this.reportUndefinedSymbols();
  }

  setupImports() {
    this.wasmImports.memory = this.pgMem.wasmMemory;
    this.wasmImports.__indirect_function_table = this.wasmTable;
    this.wasmImports.__heap_base = this.pgMem.___heap_base;

    const invokes = setupInvokeImports(this.inPg);
    this.inPg.sysCalls.setupImports();
    const sysCallImports = this.inPg.sysCalls.imports;

    for (const [key, value] of Object.entries(invokes)) {
      this.wasmImports[key] = value;
    }
    for (const [key, value] of Object.entries(sysCallImports)) {
      this.wasmImports[key] = value;
    }
    this.wasmImports.__table_base = new WebAssembly.Global(
      { value: "i32", mutable: false },
      1,
    );
    this.wasmImports.__memory_base = this.inPg.__memory_base;
    this.wasmImports.__stack_pointer = this.inPg.__stack_pointer;

    // const invokes = setupInvokeImports();
  }
  callExportFunction(functionName: string, ...args: any) {
    const func = this.wasmExports[functionName] as (...args: any) => any;
    if (!func) {
      ni(functionName);
    }
    // console.log({ functionName });
    return func(...args);
  }
  reportUndefinedSymbols() {
    for (const [symName, entry] of Object.entries(this.GOT)) {
      if (entry.value == 0) {
        const value = this.resolveGlobalSymbol(symName, true).sym as any;
        if (!value && !entry.required) {
          continue;
        }
        if (typeof value == "function") {
          entry.value = this.addFunction(value, value.sig);
        } else if (typeof value == "number") {
          entry.value = value;
        } else {
          console.log("bad export");
          throw new Error(`bad export type for '${symName}': ${typeof value}`);
        }
      }
    }
  }
  addFunction(func: (...args: any) => any, sig?: any) {
    const rtn = this.getFunctionAddress(func);
    if (rtn) {
      return rtn;
    }
    const ret = this.getEmptyTableSlot();
    try {
      this.setWasmTableEntry(ret, func);
    } catch (err) {
      if (!(err instanceof TypeError)) {
        throw err;
      }
      const wrapped = this.convertJsFunctionToWasm(func, sig);
      this.setWasmTableEntry(ret, wrapped);
    }
    this.functionsInTableMap.set(func, ret);
    return ret;
  }
  convertJsFunctionToWasm(func: (...args: any[]) => any, sig: string) {
    const typeSectionBody = [1];
    this.generateFuncType(sig, typeSectionBody);
    const bytes = [0, 97, 115, 109, 1, 0, 0, 0, 1];
    uleb128Encode(typeSectionBody.length, bytes);
    bytes.push(...typeSectionBody);
    bytes.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
    const module = new WebAssembly.Module(new Uint8Array(bytes));
    const instance = new WebAssembly.Instance(module, { e: { f: func } });
    const wrappedFunc = instance.exports["f"] as (...args: any[]) => any;
    return wrappedFunc;
  }
  generateFuncType(sig: string, target: Array<number>) {
    const sigRet = sig.slice(0, 1);
    const sigParam = sig.slice(1);
    const typeCodes: Record<string, number> = {
      i: 127,
      p: 127,
      j: 126,
      f: 125,
      d: 124,
      e: 111,
    };
    target.push(96);
    uleb128Encode(sigParam.length, target);
    for (let i = 0; i < sigParam.length; ++i) {
      target.push(typeCodes[sigParam[i]]);
    }
    if (sigRet == "v") {
      target.push(0);
    } else {
      target.push(1, typeCodes[sigRet]);
    }
  }
  resolveGlobalSymbol(symName: string, _direct = false) {
    let sym;
    if (this.#isSymbolDefined(symName)) {
      sym = this.wasmImports[symName];
    } else if (symName.startsWith("invoke_")) {
      sym = this.wasmImports[symName] = this.createInvokeFunction(
        symName.split("_")[1],
      );
    }
    return { sym, name: symName };
  }
  createInvokeFunction(sig: any) {
    return (ptr: number, ...args: any) => {
      const getCurrentStack = this
        .wasmExports["emscripten_stack_get_current"] as () => number;
      const sp = getCurrentStack();
      try {
        const func = this.getWasmTableEntry(ptr);
        return func?.(...args);
      } catch (e: any) {
        const stackRestore = this
          .wasmExports["_emscripten_stack_restore"] as (sp: number) => void;
        stackRestore(sp);
        if (e !== e + 0) throw e;
        this.callExportFunction("setThrew", 1, 0);
        if (sig[0] == "j") return 0n;
      }
    };
  }

  #mergeLibSymbols(exports: WebAssembly.Exports) {
    for (const [sym, exp] of Object.entries(exports)) {
      const setImport = (target: string) => {
        if (!this.#isSymbolDefined(target)) {
          this.wasmImports[target] = exp;
        }
      };
      setImport(sym);
      const main_alias = "__main_argc_argv";
      if (sym == "main") {
        setImport(main_alias);
      }
      if (sym == main_alias) {
        setImport("main");
      }
    }
  }

  #isSymbolDefined(symName: string) {
    const existing = this.wasmImports[symName] as
      & ((
        ...args: any[]
      ) => any)
      & { stub?: boolean } || undefined;
    if (!existing || existing.stub) {
      return false;
    }
    return true;
  }

  getFunctionAddress(func: (...args: any) => any): number {
    if (!this.functionsInTableMap) {
      this.functionsInTableMap = new WeakMap();
      this.updateTableMap(0, this.wasmTable.length);
    }
    return this.functionsInTableMap.get(func) || 0;
  }
  loadDynamicLibrary(
    libName: string,
    flags = { global: true, nodelete: true },
    localScope: any,
    handle?: number,
  ) {
    let dso = this.LDSO.loadedLibsByName[libName];
    if (dso) {
      // ni("already exists");
      if (!flags.global) {
        if (localScope) {
          Object.assign(localScope, dso.exports);
        }
      } else if (!dso.global) {
        dso.global = true;
        this.#mergeLibSymbols(dso.exports);
      }
      if (flags.nodelete && dso.refcount !== Infinity) {
        dso.refcount = Infinity;
      }
      dso.refcount++;
      if (handle) {
        this.LDSO.loadedLibsByHandle[handle] = dso;
      }
      return true;
    }
    dso = this.LDSO.newDSO(libName, handle, "loading");
    dso.refcount = flags.nodelete ? Infinity : 1;
    dso.global = flags.global;
    if (!handle) {
      ni("no handle");
    }
    // load data
    const data = this.pgMem.HEAPU32[(handle + 28) >> 2];
    const dataSize = this.pgMem.HEAPU32[(handle + 32) >> 2];

    if (data && dataSize) {
      const libData = this.pgMem.HEAP8.slice(data, data + dataSize);
      const exports = this.loadWebAssemblyModule(
        libData,
        flags,
        libName,
        localScope,
        handle,
      );
      if (dso.global) {
        this.#mergeLibSymbols(exports);
      } else if (localScope) {
        Object.assign(localScope, exports);
      }
      dso.exports = exports;
      return true;
    }
  }
  updateTableMap(offset: number, count: number) {
    if (this.functionsInTableMap) {
      for (let i = offset; i < offset + count; i++) {
        const item = this.getWasmTableEntry(i);
        if (item) {
          this.functionsInTableMap.set(item, i);
        }
      }
    }
  }
  getWasmTableEntry(funcPtr: number): (...args: any[]) => any {
    try {
      const ent = this.wasmTable.get(funcPtr) as (...args: any[]) => any;
      if (!ent) {
        throw new Error("no fucntion");
      }
      return ent;
    } catch (_e) {
      this.inPg.fileManager.debugLog({
        funcPtr,
      });
      ni("gette");
    }
  }
  setWasmTableEntry(idx: number, func: (...args: any[]) => any) {
    this.wasmTable.set(idx, func);
  }
  getEmptyTableSlot(): number {
    if (this.freeTableIndexes.length) {
      return this.freeTableIndexes.pop()!;
    }
    try {
      this.wasmTable.grow(1);
    } catch (err) {
      if (!(err instanceof RangeError)) {
        throw err;
      }
      throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
    }
    return this.wasmTable.length - 1;
  }
  loadWebAssemblyModule(
    binary: Int8Array,
    flags: any,
    _libName: any,
    localScope: any,
    handle?: number,
  ) {
    const metadata = this.getDylinkMetadata(binary);

    this.currentModuleWeakSymbols = metadata.weakImports;

    metadata.neededDynlibs.forEach((needed) =>
      this.loadDynamicLibrary(needed, flags, localScope)
    );
    const firstLoad = !handle || !this.pgMem.HEAP8[handle + 8];
    let memoryBase = 0;
    let tableBase = 0;
    if (firstLoad) {
      const memAlign = Math.pow(2, metadata.memoryAlign);
      memoryBase = metadata.memorySize
        ? this.pgMem.alignMemory(
          this.inPg.getMemory(metadata.memorySize + memAlign),
          memAlign,
        )
        : 0;
      const tableBase = metadata.tableSize ? this.wasmTable.length : 0;
      if (handle) {
        this.pgMem.HEAP8[handle + 8] = 1;
        this.pgMem.HEAPU32[(handle + 12) >> 2] = memoryBase;
        this.pgMem.HEAP32[(handle + 16) >> 2] = metadata.memorySize;
        this.pgMem.HEAPU32[(handle + 20) >> 2] = tableBase;
        this.pgMem.HEAP32[(handle + 24) >> 2] = metadata.tableSize;
      }
    } else {
      memoryBase = this.pgMem.HEAPU32[(handle! + 12) >> 2];
      tableBase = this.pgMem.HEAPU32[(handle! + 20) >> 2];
    }

    const tableGrowthNeeded = tableBase + metadata.tableSize -
      this.wasmTable.length;
    if (tableGrowthNeeded > 0) {
      this.wasmTable.grow(tableGrowthNeeded);
    }
    let moduleExports: Record<string, any> = {};
    const resolveSymbol = (sym: string) => {
      let resolved = this.resolveGlobalSymbol(sym).sym;
      if (!resolved && localScope) {
        resolved = localScope[sym];
      }
      if (!resolved) {
        resolved = moduleExports[sym];
      }
      return resolved;
    };
    const wasmImports = this.wasmImports;
    const proxyHandler = {
      get(stubs: Record<string, any>, prop: string) {
        switch (prop) {
          case "__memory_base":
            return memoryBase;
          case "__table_base":
            return tableBase;
        }
        if (prop in wasmImports && !(wasmImports[prop] as any).stub) {
          return wasmImports[prop];
        }
        if (!(prop in stubs)) {
          let resolved;
          stubs[prop] = (...args: any) => {
            resolved ||= resolveSymbol(prop);
            if (!resolved) {
              if (prop === "getTempRet0") {
                ni("foff");
                // return __emscripten_tempret_get(...args);
              }
              throw new Error(
                `Dynamic linking error: cannot resolve symbol ${prop}`,
              );
            }
            return resolved(...args);
          };
        }
        return stubs[prop];
      },
    };
    const proxy = new Proxy({}, proxyHandler);
    const GOTHandler = this.GOTHandler;
    const info = {
      "GOT.mem": new Proxy({}, GOTHandler),
      "GOT.func": new Proxy({}, GOTHandler),
      env: proxy,
      wasi_snapshot_preview1: proxy,
    };
    const postInstantiation = (_module: any, instance: any) => {
      this.updateTableMap(tableBase, metadata.tableSize);
      moduleExports = this.relocateExports(instance.exports, memoryBase);
      if (!flags.allowUndefined) {
        // this.reportUndefinedSymbols();
      }

      const applyRelocs = moduleExports["__wasm_apply_data_relocs"];
      if (applyRelocs) {
        applyRelocs();
      }
      const init = moduleExports["__wasm_call_ctors"];
      if (init) {
        init();
      }
      return moduleExports;
    };

    const module = binary instanceof WebAssembly.Module
      ? binary
      : new WebAssembly.Module(binary);
    const instance = new WebAssembly.Instance(module, info);
    return postInstantiation(module, instance);
  }
  getDylinkMetadata(binary: Int8Array | Uint8Array): DLMetaData {
    let offset = 0;
    let end = 0;
    let libname = "";
    function getU8() {
      return binary[offset++];
    }
    function getLEB() {
      let ret = 0;
      let mul = 1;
      while (1) {
        const byte = binary[offset++];
        ret += (byte & 127) * mul;
        mul *= 128;
        if (!(byte & 128)) break;
      }
      return ret;
    }
    function getString() {
      const len = getLEB();
      offset += len;
      return UTF8ArrayToString(binary, offset - len, len);
    }
    function failIf(condition: boolean, message?: string) {
      if (condition) throw new Error(message);
    }
    let name = "dylink.0";
    if (binary instanceof WebAssembly.Module) {
      let dylinkSection = WebAssembly.Module.customSections(binary, name);
      if (dylinkSection.length === 0) {
        name = "dylink";
        dylinkSection = WebAssembly.Module.customSections(binary, name);
      }
      failIf(dylinkSection.length === 0, "need dylink section");
      binary = new Uint8Array(dylinkSection[0]);
      end = binary.length;
    } else {
      const int32View = new Uint32Array(
        new Uint8Array(binary.subarray(0, 24)).buffer,
      );
      const magicNumberFound = int32View[0] == 1836278016;
      failIf(!magicNumberFound, "need to see wasm magic number");
      failIf(binary[8] !== 0, "need the dylink section to be first");
      offset = 9;
      const section_size = getLEB();
      end = offset + section_size;
      name = getString();
    }
    const customSection: DLMetaData = {
      neededDynlibs: [],
      tlsExports: new Set<string>(),
      weakImports: new Set<string>(),
      memorySize: 0,
      memoryAlign: 0,
      tableSize: 0,
      tableAlign: 0,
    };
    if (name == "dylink") {
      customSection.memorySize = getLEB();
      customSection.memoryAlign = getLEB();
      customSection.tableSize = getLEB();
      customSection.tableAlign = getLEB();
      const neededDynlibsCount = getLEB();

      for (let i = 0; i < neededDynlibsCount; ++i) {
        const libname = getString();
        customSection.neededDynlibs.push(libname);
      }
    } else {
      failIf(name !== "dylink.0");
      const WASM_DYLINK_MEM_INFO = 1;
      const WASM_DYLINK_NEEDED = 2;
      const WASM_DYLINK_EXPORT_INFO = 3;
      const WASM_DYLINK_IMPORT_INFO = 4;
      const WASM_SYMBOL_TLS = 256;
      const WASM_SYMBOL_BINDING_MASK = 3;
      const WASM_SYMBOL_BINDING_WEAK = 1;
      while (offset < end) {
        const subsectionType = getU8();
        const subsectionSize = getLEB();
        if (subsectionType === WASM_DYLINK_MEM_INFO) {
          customSection.memorySize = getLEB();
          customSection.memoryAlign = getLEB();
          customSection.tableSize = getLEB();
          customSection.tableAlign = getLEB();
        } else if (subsectionType === WASM_DYLINK_NEEDED) {
          const neededDynlibsCount = getLEB();
          for (let i = 0; i < neededDynlibsCount; ++i) {
            libname = getString();
            customSection.neededDynlibs.push(libname);
          }
        } else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
          let count = getLEB();
          while (count--) {
            const symname = getString();
            const flags = getLEB();
            if (flags & WASM_SYMBOL_TLS) {
              customSection.tlsExports.add(symname);
            }
          }
        } else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
          let count = getLEB();
          while (count--) {
            const _modname = getString();
            const symname = getString();
            const flags = getLEB();
            if (
              (flags & WASM_SYMBOL_BINDING_MASK) ==
                WASM_SYMBOL_BINDING_WEAK
            ) {
              customSection.weakImports.add(symname);
            }
          }
        } else {
          offset += subsectionSize;
        }
      }
    }
    return customSection;
  }
  relocateExports(exports: any, memoryBase: number, replace?: any) {
    const relocated: Record<string, any> = {};
    for (const e in exports) {
      let value = exports[e];
      if (typeof value == "object") {
        value = value.value;
      }
      if (typeof value == "number") {
        value += memoryBase;
      }
      relocated[e] = value;
    }
    this.updateGOT(relocated, replace);
    return relocated;
  }
  updateGOT(exports: Record<string, any>, replace: boolean) {
    for (const symName in exports) {
      if (this.isInternalSym(symName)) {
        continue;
      }
      const value = exports[symName];
      this.GOT[symName] ||= new WebAssembly.Global({
        value: "i32",
        mutable: true,
      });
      if (replace || this.GOT[symName].value == 0) {
        if (typeof value == "function") {
          this.GOT[symName].value = this.addFunction(value);
        } else if (typeof value == "number") {
          this.GOT[symName].value = value;
        } else {
          ni(`unhandled export type for '${symName}': ${typeof value}`);
        }
      }
    }
  }
  isInternalSym(symName: string) {
    return [
      "__cpp_exception",
      "__c_longjmp",
      "__wasm_apply_data_relocs",
      "__dso_handle",
      "__tls_size",
      "__tls_align",
      "__set_stack_limits",
      "_emscripten_tls_init",
      "__wasm_init_tls",
      "__wasm_call_ctors",
      "__start_em_asm",
      "__stop_em_asm",
      "__start_em_js",
      "__stop_em_js",
    ].includes(symName) || symName.startsWith("__em_js__");
  }
}
