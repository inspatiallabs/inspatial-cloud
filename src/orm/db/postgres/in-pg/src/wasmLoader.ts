// import { setupInvokeImports } from "./setupInvokes.js";

import type { InPG } from "../in-pg.ts";

import type { PGMem } from "./pgMem.ts";
import { setupInvokeImports } from "./setupInvokes.ts";
import { setupOther } from "./setupOther.ts";

type WasmExports = Record<PropertyKey, Function>;
type WasmImports = WebAssembly.ModuleImports;
class LDSO {
  loadedLibsByName: Record<string, any>;
  loadedLibsByHandle: Record<string, any>;
  constructor() {
    this.loadedLibsByName = {};
    this.loadedLibsByHandle = {};
  }
  init(wasmImports: WasmImports) {
    this.newDSO("__main__", 0, wasmImports);
  }
  newDSO(name: string, handle: number, syms: WasmImports) {
    const dso = { refcount: Infinity, name, exports: syms, global: true };
    this.loadedLibsByName[name] = dso;
    if (handle != undefined) {
      this.loadedLibsByHandle[handle] = dso;
    }
    return dso;
  }
}
export class WasmLoader {
  wasmPath: string;
  wasmImports: WasmImports;
  wasmTable;
  GOT: Record<string, any>;
  currentModuleWeakSymbols = new Set<string>([]);
  LDSO;
  functionsInTableMap: WeakMap<any, any>;
  wasmExports: WebAssembly.Exports;
  freeTableIndexes: Array<number>;
  inPg: InPG;

  get pgMem(): PGMem {
    return this.inPg.pgMem;
  }
  constructor(inPg: InPG, wasmPath: string) {
    this.GOT = {};
    this.inPg = inPg;
    this.wasmPath = wasmPath;
    this.wasmExports = {};
    this.wasmImports = {};
    this.LDSO = new LDSO();
    this.functionsInTableMap = new WeakMap();
    this.freeTableIndexes = [];
    this.wasmTable = new WebAssembly.Table({
      initial: 5919,
      element: "anyfunc",
    });
  }
  async load() {
    const GOT = this.GOT;
    const currentModuleWeakSymbols = this.currentModuleWeakSymbols;
    const GOTHandler = {
      get(obj: object, symName: string) {
        var rtn = GOT[symName];
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
    this.setupImports();
    const wasmImports = this.wasmImports;
    const info: WebAssembly.Imports = {
      env: this.wasmImports,
      wasi_snapshot_preview1: wasmImports,
      "GOT.mem": new Proxy(
        wasmImports,
        GOTHandler,
      ) as WebAssembly.ModuleImports,
      "GOT.func": new Proxy(
        wasmImports,
        GOTHandler,
      ) as WebAssembly.ModuleImports,
    };
    const buffer = await Deno.readFile(this.wasmPath);
    const result = await WebAssembly.instantiate(buffer, info);
    this.wasmExports = result.instance.exports;

    for (var [sym, exp] of Object.entries(result.instance.exports)) {
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

    setupOther(this.inPg);
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
    this.wasmImports.__memory_base = new WebAssembly.Global(
      { value: "i32", mutable: false },
      12582912,
    );
    this.wasmImports.__stack_pointer = new WebAssembly.Global(
      { value: "i32", mutable: true },
      15195744,
    );

    // const invokes = setupInvokeImports();
  }
  callExportFunction(functionName: string, ...args: any) {
    const func = this.wasmExports[functionName];
    return func(...args);
  }
  reportUndefinedSymbols() {
    const entsry = this.GOT["__heap_base"];

    for (var [symName, entry] of Object.entries(this.GOT)) {
      if (entry.value == 0) {
        var value = this.resolveGlobalSymbol(symName, true).sym;
        if (!value && !entry.required) {
          continue;
        }
        if (typeof value == "number") {
          entry.value = value;
        } else {
          throw new Error(
            `bad export type for '${symName}': ${typeof value}`,
          );
        }
      }
    }
  }

  resolveGlobalSymbol(symName: string, direct = false) {
    var sym;
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
    console.log({ sig });
    return (ptr: number, ...args: any) => {
      var sp = this.inPg.pgMem.stackSave();
      try {
        const func = this.getWasmTableEntry(ptr);
        return func?.(...args);
      } catch (e) {
        this.inPg.pgMem.stackRestore(sp);
        if (e !== e + 0) throw e;
        this.callExportFunction("setThrew", 1, 0);
        if (sig[0] == "j") return 0n;
      }
    };
  }

  #mergeLibSymbols(exports: WebAssembly.Exports) {
  }

  #isSymbolDefined(symName: string) {
    const existing = this.wasmImports[symName];
    if (!existing || existing.stub) {
      return false;
    }
    return true;
  }

  getFunctionAddress(func: Function) {
    if (!this.functionsInTableMap) {
      this.functionsInTableMap = new WeakMap();
      this.updateTableMap(0, this.wasmTable.length);
    }
    return this.functionsInTableMap.get(func) || 0;
  }

  updateTableMap(offset: number, count: number) {
    if (this.functionsInTableMap) {
      for (var i = offset; i < offset + count; i++) {
        var item = this.getWasmTableEntry(i);
        if (item) {
          this.functionsInTableMap.set(item, i);
        }
      }
    }
  }
  getWasmTableEntry(funcPtr: number) {
    return this.wasmTable.get(funcPtr);
  }
  setWasmTableEntry(idx: number, func: Function) {
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
}
