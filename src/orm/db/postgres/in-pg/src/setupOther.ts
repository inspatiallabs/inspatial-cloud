import { type InPG, ni } from "../in-pg.ts";
import { ERRNO_CODES } from "./constants.ts";
import { bigintToI53Checked } from "./convert.ts";

export function setupOther(inPg: InPG) {
  const sys = inPg.sysCalls;
  const pgMem = inPg.pgMem;
  const loader = inPg.wasmLoader;
  const fm = inPg.fileManager;

  sys.add("getaddrinfo", "ipppp", (node, service, hint, out) => {
    return -1;
  });
  sys.add("getnameinfo", "ipipipii", () => {
    ni();
  });
  sys.add("proc_exit", "vi", () => {
    ni();
  });
  sys.add("__assert_fail", "vppip", () => {
    ni();
  });
  "_emscripten_fs_load_embedded_files";
  sys.add("__call_sighandler", "vpi", () => {
    ni();
  });

  sys.add("_abort_js", "v", () => sys.inPg.abort(""));
  sys.add("_dlopen_js", "pp", (ptr) => {
    let path = fm.getPtrPath(ptr + 36);
    var flags = pgMem.HEAP32[(ptr + 4) >> 2];
    path = fm.parsePath(path);
    fm.debugLog(path);
    var global = Boolean(flags & 256);
    var localScope = global ? null : {};
    var combinedFlags = {
      global,
      nodelete: Boolean(flags & 4096),
      loadAsync: false,
    };
    try {
      return loader.loadDynamicLibrary(
        path,
        combinedFlags,
        localScope,
        ptr,
      );
    } catch (e) {
      console.log(e);
      // dlSetError(`Could not load dynamic lib: ${filename}\n${e}`);
      return 0;
    }
  });
  sys.add("_dlsym_js", "pppp", (handle, symbol, symbolIndex) => {
    symbol = pgMem.UTF8ToString(symbol);
    var result;
    var newSymIndex;
    var lib = loader.LDSO.loadedLibsByHandle[handle];
    if (!lib.exports.hasOwnProperty(symbol) || lib.exports[symbol].stub) {
      return 0;
    }
    newSymIndex = Object.keys(lib.exports).indexOf(symbol);
    result = lib.exports[symbol];
    if (typeof result == "function") {
      var addr = loader.getFunctionAddress(result);
      if (addr) {
        result = addr;
      } else {
        result = loader.addFunction(result, result.sig);
        pgMem.HEAPU32[symbolIndex >> 2] = newSymIndex;
      }
    }
    return result;
  });
  sys.add("_emscripten_get_progname", "vpi", (str, len) => {
    return pgMem.stringToUTF8(inPg.getExecutableName(), str, len);
  });
  sys.add("_emscripten_memcpy_js", "vppp", (dest, src, num) => {
    pgMem.HEAPU8.copyWithin(dest, src, src + num);
  });
  sys.add("_emscripten_runtime_keepalive_clear", "v", () => {
    ni();
  });
  sys.add("_emscripten_system", "ip", (command) => {
    if (!command) return 1;
    return 0 << 8;
  });
  sys.add("_emscripten_throw_longjmp", "v", () => {
    throw Infinity;
  });
  sys.add("_gmtime_js", "vjp", () => {
    ni();
  });
  sys.add("_localtime_js", "vjp", () => {
    ni();
  });
  sys.add(
    "_mmap_js",
    "ipiiijpp",
    (len, prot, flags, fd, offset, allocatedPtr, addr) => {
      offset = bigintToI53Checked(offset);
      if (isNaN(offset)) return 61;
      const file = fm.getFile(fd);
      if (file.isMem) {
        const { ptr, allocated } = file.file.mmap(len, offset);
        pgMem.HEAP32[allocatedPtr >> 2] = allocated ? 1 : 0;
        pgMem.HEAPU32[addr >> 2] = ptr;
        return 0;
      }
      return ERRNO_CODES.EBADF;
    },
  );
  sys.add("_munmap_js", "ippiiij", () => {
    ni();
  });
  sys.add("_setitimer_js", "iid", () => {
    ni();
  });
  sys.add("_tzset_js", "vpppp", () => {
    ni();
  });
  sys.add("clock_time_get", "iijp", (clk_id, ignored_precision, ptime) => {
    ignored_precision = bigintToI53Checked(ignored_precision);
    if (clk_id < 0 || clk_id > 3) {
      return 28;
    }
    let now;
    if (clk_id === 0) {
      now = Date.now();
    } else {
      now = performance.now();
    }
    const nsec = Math.round(now * 1e3 * 1e3);
    pgMem.HEAP64[ptime >> 3] = BigInt(nsec);
    return 0;
  });
  sys.add("emscripten_asm_const_int", "ippp", (
    code: number,
    sigPtr: number,
    argbuf: number,
  ) => {
    return inPg.runEmAsmFunction(code, sigPtr, argbuf);
  });
  sys.add("emscripten_date_now", "d", () => {
    return Date.now();
  });
  sys.add("emscripten_force_exit", "vi", () => {
    ni();
  });
  sys.add("emscripten_get_now", "d", () => {
    ni();
  });
  sys.add("emscripten_resize_heap", "ip", (requestedSize) => {
    var oldSize = pgMem.HEAPU8.length;
    requestedSize >>>= 0;
    var maxHeapSize = pgMem.getHeapMax();
    if (requestedSize > maxHeapSize) {
      return false;
    }
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
      var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
      overGrownHeapSize = Math.min(
        overGrownHeapSize,
        requestedSize + 100663296,
      );
      var newSize = Math.min(
        maxHeapSize,
        pgMem.alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536),
      );
      var replacement = pgMem.growMemory(newSize);
      if (replacement) {
        return true;
      }
    }
    return false;
  });
  sys.add("environ_get", "ipp", (__environ, environ_buf) => {
    let bufSize = 0;
    inPg.env.forEach((string, i) => {
      const ptr = environ_buf + bufSize;
      pgMem.HEAPU32[(__environ + i * 4) >> 2] = ptr;
      pgMem.stringToAscii(string, ptr);
      bufSize += string.length + 1;
    });
  });
  sys.add("environ_sizes_get", "ipp", (penviron_count, penviron_buf_size) => {
    const strings = inPg.env;
    pgMem.HEAPU32[penviron_count >> 2] = strings.length;
    let bufSize = 0;
    strings.forEach((string) => (bufSize += string.length + 1));
    pgMem.HEAPU32[penviron_buf_size >> 2] = bufSize;
    return 0;
  });
  sys.add("exit", "vi", (status, implicit) => {
    Deno.exit(status);
  });
  sys.add("fd_close", "ii", (fd) => {
    return fm.closeFile(fd);
  });
  sys.add("fd_fdstat_get", "iip", (fd, pbuf) => {
    let type;
    switch (fd) {
      case 0:
      case 1:
      case 2:
        type = 4; // file
        break;
      default:
        ni("unexpected");
    }
    pgMem.HEAP8[pbuf] = type;
    pgMem.HEAP16[(pbuf + 2) >> 1] = 0;
    pgMem.HEAP64[(pbuf + 8) >> 3] = 0n;
    pgMem.HEAP64[(pbuf + 16) >> 3] = 0n;
    return 0;
  });
  sys.add("fd_pread", "iippjp", (fd, iov, iovcnt, offset, pnum) => {
    offset = bigintToI53Checked(offset);
    if (isNaN(offset)) return 61;

    const pgFile = fm.getFile(fd);
    if (!pgFile) return -1;
    if (pgFile.isMem) {
      return;
    }
    const file = pgFile.file;
    const originalPos = file.seekSync(0, Deno.SeekMode.Current);

    let total = 0;

    for (let i = 0; i < iovcnt; i++) {
      const ptr = pgMem.HEAPU32[iov >> 2];
      const len = pgMem.HEAPU32[(iov + 4) >> 2];
      iov += 8;

      const buffer = new Uint8Array(len);
      file.seekSync(offset, Deno.SeekMode.Start);
      const bytesRead = file.readSync(buffer) ?? 0;

      pgMem.HEAPU8.set(buffer.subarray(0, bytesRead), ptr);

      total += bytesRead;
      if (bytesRead < len) break;
      offset += bytesRead;
    }

    file.seekSync(originalPos, Deno.SeekMode.Start);
    pgMem.HEAPU32[pnum >> 2] = total;

    return 0;
  });
  sys.add("fd_pwrite", "iippjp", (fd, iov, iovcnt, offset, pnum) => {
    offset = bigintToI53Checked(offset);
    const pgFile = fm.getFile(fd);
    if (!pgFile) return -1;
    if (pgFile.isMem) {
      return 0;
    }
    const file = pgFile.file;
    let total = 0;
    const originalPos = file.seekSync(0, Deno.SeekMode.Current);
    for (let i = 0; i < iovcnt; i++) {
      const ptr = pgMem.HEAPU32[iov >> 2];
      const len = pgMem.HEAPU32[(iov + 4) >> 2];
      iov += 8;
      const chunk = pgMem.HEAPU8.subarray(ptr, ptr + len);
      file.seekSync(offset, Deno.SeekMode.Start);
      const written = file.writeSync(chunk);
      offset += written;
      total += written;
    }
    file.seekSync(originalPos, Deno.SeekMode.Start);
    pgMem.HEAPU32[pnum >> 2] = total;
    return 0;
  });
  sys.add("fd_read", "iippp", (fd, iov, iovcnt, pnum) => {
    const file = fm.getFile(fd);

    if (!file) {
      Deno.exit(1);
    }
    let bytesRead = 0;
    let dataOffset = 0;

    for (let i = 0; i < iovcnt; i++) {
      const ptr = pgMem.HEAPU32[iov >> 2];
      const len = pgMem.HEAPU32[(iov + 4) >> 2];
      iov += 8;
      const buffer = new Uint8Array(len);
      const readCount = file.file.readSync(buffer);

      if (readCount === null) {
        break;
      }
      const chunk = buffer.slice(0, readCount);
      pgMem.HEAPU8.set(chunk, ptr);

      bytesRead += chunk.length;
      dataOffset += chunk.length;

      if (chunk.length < len) break; // EOF
    }

    pgMem.HEAPU32[pnum >> 2] = bytesRead;

    return 0;
  });
  sys.add(
    "fd_seek",
    "iijip",
    (fd, offset, whence, newOffsetPtr) => {
      offset = bigintToI53Checked(offset);
      const file = fm.getFile(fd);
      if (!file) return -1;
      if (file.isMem) {
        return 0;
      }
      const newPos = file.file.seekSync(offset, whence);

      pgMem.HEAPU32[newOffsetPtr >> 2] = newPos >>> 0;
      pgMem.HEAPU32[(newOffsetPtr + 4) >> 2] = (newPos / 2 ** 32) >>> 0;
      return 0;
    },
  );
  sys.add("fd_sync", "ii", (fd) => {
    const file = fm.getFile(fd);
    if (!file) {
      return -1;
    }
    if (file.isMem) {
      return 0;
    }
    file.file.syncSync();
    return 0;
  });
  sys.add("fd_write", "iippp", (fd, iov, iovcnt, pnum) => {
    const file = fm.getFile(fd);
    let written = 0;
    for (let i = 0; i < iovcnt; i++) {
      const ptr = pgMem.HEAPU32[iov >> 2];
      const len = pgMem.HEAPU32[(iov + 4) >> 2];
      iov += 8;

      const chunk = pgMem.HEAPU8.slice(ptr, ptr + len);
      const writtenLength = file!.file.writeSync(chunk);
      written += writtenLength;
    }
    pgMem.HEAPU32[pnum >> 2] = written;

    return 0;
  });
}
