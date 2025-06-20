import { normalizeVirtualPath } from "./convert.ts";
import type { PGMem } from "./pgMem.ts";

export class ExitStatus {
  name = "ExitStatus";
  message: string;
  status: number;
  constructor(status: number) {
    this.message = `Program terminated with exit(${status})`;
    this.status = status;
  }
}

export class ExceptionInfo {
  excPtr: number;
  ptr: number;
  mem: PGMem;
  constructor(excPtr: number, mem: PGMem) {
    this.mem = mem;
    this.excPtr = excPtr;
    this.ptr = excPtr - 24;
  }
  set_type(type: number) {
    this.mem.HEAPU32[(this.ptr + 4) >> 2] = type;
  }
  get_type() {
    return this.mem.HEAPU32[(this.ptr + 4) >> 2];
  }
  set_destructor(destructor: number) {
    this.mem.HEAPU32[(this.ptr + 8) >> 2] = destructor;
  }
  get_destructor() {
    return this.mem.HEAPU32[(this.ptr + 8) >> 2];
  }
  set_caught(caught: boolean | number) {
    caught = caught ? 1 : 0;
    this.mem.HEAP8[this.ptr + 12] = caught;
  }
  get_caught() {
    return this.mem.HEAP8[this.ptr + 12] != 0;
  }
  set_rethrown(rethrown: boolean | number) {
    rethrown = rethrown ? 1 : 0;
    this.mem.HEAP8[this.ptr + 13] = rethrown;
  }
  get_rethrown() {
    return this.mem.HEAP8[this.ptr + 13] != 0;
  }
  init(type: number, destructor: number) {
    this.set_adjusted_ptr(0);
    this.set_type(type);
    this.set_destructor(destructor);
  }
  set_adjusted_ptr(adjustedPtr: number) {
    this.mem.HEAPU32[(this.ptr + 16) >> 2] = adjustedPtr;
  }
  get_adjusted_ptr() {
    return this.mem.HEAPU32[(this.ptr + 16) >> 2];
  }
}

export function getTempDirBase() {
  let path = Deno.makeTempFileSync();
  if (Deno.build.os === "windows") {
    const driveLetter = path.match(/^[a-zA-Z]:/)?.[0] || "";
    path = `${driveLetter}${normalizeVirtualPath(path)}`;
  }
  Deno.removeSync(path);
  const parts = path.split("/");
  parts.pop();
  const tmpdir = parts.join("/");
  return tmpdir;
}
