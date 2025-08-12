// @generated file from wasmbuild -- do not edit
// @ts-nocheck: generated
// deno-lint-ignore-file
// deno-fmt-ignore-file

let wasm;
export function __wbg_set_wasm(val) {
  wasm = val;
}

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
  if (
    cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0
  ) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}
/**
 * @param {Uint8Array} input
 * @param {number} width
 * @param {number} height
 * @param {number} filter
 * @returns {Uint8Array}
 */
export function resize_image(input: Uint8Array, width: number, height: number, filter: number=4): Uint8Array {
  const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.resize_image(ptr0, len0, width, height, filter);
  var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v2;
}

/**
 * Chroma subsampling format
 * @enum {0 | 1 | 2 | 3}
 */
export const ChromaSampling = Object.freeze({
  /**
   * Both vertically and horizontally subsampled.
   */
  Cs420: 0,
  "0": "Cs420",
  /**
   * Horizontally subsampled.
   */
  Cs422: 1,
  "1": "Cs422",
  /**
   * Not subsampled.
   */
  Cs444: 2,
  "2": "Cs444",
  /**
   * Monochrome.
   */
  Cs400: 3,
  "3": "Cs400",
}) as const;

export function __wbindgen_init_externref_table() {
  const table = wasm.__wbindgen_export_0;
  const offset = table.grow(4);
  table.set(0, undefined);
  table.set(offset + 0, undefined);
  table.set(offset + 1, null);
  table.set(offset + 2, true);
  table.set(offset + 3, false);
}
