import type { InPG } from "../in-pg.ts";
import {
  lengthBytesUTF8,
  stringToUTF8Array,
  UTF8ArrayToString,
} from "./convert.ts";

export class PGMem {
  HEAP8!: Int8Array;
  HEAPU8!: Uint8Array;
  HEAP16!: Int16Array;
  HEAPU16!: Uint16Array;
  HEAP32!: Int32Array;
  HEAPU32!: Uint32Array;
  HEAPF32!: Float32Array;
  HEAP64!: BigInt64Array;
  HEAPU64!: BigUint64Array;
  HEAPF64!: Float64Array;
  initMemory;
  wasmMemory;
  ___heap_base;
  inPg: InPG;
  constructor(inPg: InPG) {
    this.inPg = inPg;
    this.initMemory = inPg.initMemory;
    this.___heap_base = inPg.___heap_base;
    this.wasmMemory = new WebAssembly.Memory({
      initial: this.initMemory / 65536,
      maximum: 32768,
    });
  }
  init() {
    this.updateMemoryViews();
  }
  zeroMemory(address: number, size: number) {
    this.HEAPU8.fill(0, address, address + size);
  }
  updateMemoryViews() {
    const buffer = this.wasmMemory.buffer;
    this.HEAP8 = new Int8Array(buffer);
    this.HEAP16 = new Int16Array(buffer);
    this.HEAPU8 = new Uint8Array(buffer);
    this.HEAPU16 = new Uint16Array(buffer);
    this.HEAP32 = new Int32Array(buffer);
    this.HEAPU32 = new Uint32Array(buffer);
    this.HEAPF32 = new Float32Array(buffer);
    this.HEAPF64 = new Float64Array(buffer);
    this.HEAP64 = new BigInt64Array(buffer);
    this.HEAPU64 = new BigUint64Array(buffer);
  }
  getHeapMax() {
    return 2147483648;
  }
  getStr(pointer: number): string {
    const bytes = [];
    let byte;
    while ((byte = this.HEAPU8[pointer++]) !== 0) {
      bytes.push(byte);
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
  alignMemory(size: number, alignment: number) {
    return Math.ceil(size / alignment) * alignment;
  }
  growMemory(size: number) {
    let buffer = this.wasmMemory.buffer;
    const pages = ((size - buffer.byteLength + 65535) / 65536) | 0;
    try {
      this.wasmMemory.grow(pages);
      this.updateMemoryViews();
      return 1;
    } catch (e) {}
  }
  stackSave() {
    this.inPg.wasmLoader.callExportFunction(
      "emscripten_stack_get_current",
    );
  }
  stackRestore(val) {
    this.inPg.wasmLoader.callExportFunction(
      "_emscripten_stack_restore",
      val,
    );
  }

  stackAlloc(sz) {
    return this.inPg.wasmLoader.callExportFunction(
      "_emscripten_stack_alloc",
      sz,
    );
  }
  mmapAlloc(size: number) {
    size = this.alignMemory(size, 65536);
    const ptr = this.inPg.wasmLoader.callExportFunction(
      "emscripten_builtin_memalign",
      65536,
      size,
    );
    if (ptr) this.zeroMemory(ptr, size);
    return ptr;
  }
  stringToUTF8OnStack(str) {
    var size = lengthBytesUTF8(str) + 1;
    var ret = this.stackAlloc(size);
    this.stringToUTF8(str, ret, size);
    return ret;
  }
  stringToUTF8(str: string, outPtr: number, maxBytesToWrite: number) {
    stringToUTF8Array(str, this.HEAPU8, outPtr, maxBytesToWrite);
  }
  UTF8ToString(ptr: number, maxBytesToRead?: number) {
    return UTF8ArrayToString(this.HEAPU8, ptr, maxBytesToRead);
  }
  stringToAscii(str: string, bufPtr: number) {
    for (var i = 0; i < str.length; ++i) {
      this.HEAP8[bufPtr++] = str.charCodeAt(i);
    }
    this.HEAP8[bufPtr] = 0;
  }
}
