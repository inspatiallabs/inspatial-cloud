import { type InPG, ni } from "../in-pg.ts";
import { ERRNO_CODES, IOCTL } from "./constants.ts";
import { bigintToI53Checked, lengthBytesUTF8 } from "./convert.ts";
import type { FileManager } from "./fileManager/in-pg-files.ts";
import type { PGMem } from "./pgMem.ts";
import { ExceptionInfo, ExitStatus } from "./utils.ts";
import type { WasmLoader } from "./wasmLoader.ts";

export class SysCalls {
  DEFAULT_POLLMASK: number;
  inPg: InPG;
  pgMem: PGMem;
  loader: WasmLoader;
  fm: FileManager;
  varargs?: number;
  methods: Map<string, (...args: any) => any>;

  constructor(inPg: InPG) {
    this.DEFAULT_POLLMASK = 5;
    this.inPg = inPg;
    this.pgMem = this.inPg.pgMem;
    this.methods = new Map();
    this.fm = this.inPg.fileManager;
    this.loader = this.inPg.wasmLoader;
  }
  get imports() {
    return Object.fromEntries(this.methods);
  }

  add(name: string, signal: string, method: (...args: any) => any) {
    if (this.methods.has(name)) {
      throw new Error(`already has ${name}`);
    }

    const debugLog = (message: any) => this.fm.debugLog(message);
    const func = (...params: any) => {
      const message = name + ": " + params;

      debugLog(message);

      try {
        return method(...params);
      } catch (e) {
        if (e === Infinity) {
          throw e;
        }
        if (Error.isError(e) && "code" in e) {
          const code = e.code as keyof typeof ERRNO_CODES;
          console.log(e.name, e.message, e.code);
          const codeNum = ERRNO_CODES[code];
          Deno.exit(1);
          if (codeNum) {
            return -codeNum;
          }
        }
        console.log("unknown error", { e });
        throw e;
      }
    };
    func.sig = signal;
    this.methods.set(name, func);
  }

  syscallGetVarargI(): number {
    if (this.varargs === undefined) {
      throw new Error("varags undefined");
    }
    const ret = this.pgMem.HEAP32[+this.varargs >> 2];
    this.varargs += 4;
    return ret;
  }
  syscallGetVarargP() {
    return this.syscallGetVarargI();
  }
  setupImports() {
    this.add("__syscall_chdir", "ip", (pathPointer: number) => {
      return this.fm.chdirPtr(pathPointer);
    });

    this.add("__syscall_fcntl64", "iiip", (_fd: number, cmd, varargs) => {
      this.varargs = varargs;
      // const file = this.fm.getFile(fd);
      switch (cmd) {
        case 0: {
          ni();
          return;
        }
        case 1:
        case 2:
          return 0;
        case 3:
          ni();
          return 0;
        case 4: {
          // ni();
          const _arg = this.syscallGetVarargI();

          return 0;
        }
        case 12: {
          const arg = this.syscallGetVarargP();
          const offset = 0;
          this.pgMem.HEAP16[(arg + offset) >> 1] = 2;
          return 0;
        }
        case 13:
        case 14:
          return 0;
      }
      return -28;
    });

    this.add(
      "__syscall_openat",
      "iipip",
      (_dirfd, pathPointer, flags, varargs) => {
        const O_ACCMODE = 0b11;
        const O_CREAT = 0x40;
        const O_APPEND = 0x400;
        const O_TRUNC = 0x200;
        const _O_NOFOLLOW = 0x8000;

        const path = this.fm.getPtrPath(pathPointer);
        const accessMode = flags & O_ACCMODE;
        const mode = varargs ? this.pgMem.HEAP32[+varargs >> 2] : 0;

        const willFsync = this.fm.isWindows ? path.startsWith("./") : false;
        const create = !!(flags & O_CREAT);
        const append = !!(flags & O_APPEND);
        const truncate = !!(flags & O_TRUNC);

        const options: Deno.OpenOptions = {
          mode,
          create,
          append,
          truncate,
          read: accessMode === 0 || accessMode === 2,
          write: accessMode === 1 || accessMode === 2 || willFsync,
        };

        try {
          const file = this.fm.openFile(path, options);

          return file.fd;
        } catch (e) {
          if (e instanceof Deno.errors.NotFound) {
            return -ERRNO_CODES.ENOENT;
          }
          throw e;
        }
      },
    );

    this.add("__syscall_unlinkat", "iipi", (dirfd, pathPointer, flags) => {
      return this.fm.unlinkat(dirfd, pathPointer, flags);
    });

    this.add("__syscall_fadvise64", "iijji", () => {
      return 0;
    });
    this.add("__syscall_getcwd", "iij", (buf, size) => {
      if (size === 0) return -28;
      const cwd = this.fm.cwd;
      const cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
      if (size < cwdLengthInBytes) return -68;
      this.pgMem.stringToUTF8(cwd, buf, size);
      return cwdLengthInBytes;
    });
    this.add("__syscall_dup", "ii", (fd) => {
      return this.fm.dupe(fd);
    });
    this.add("__syscall_dup3", "iiii", (fd, newfd, _flags) => {
      if (fd === newfd) {
        return -ERRNO_CODES.EINVAL;
      }
      return this.fm.dupe3(fd, newfd);
    });
    this.add(
      "__syscall_faccessat",
      "iipii",
      (_dirfd, pathPointer, _amode, _flags) => {
        const path = this.fm.getPtrPath(pathPointer);

        // if (amode & ~7) {
        //   return -28;
        // }
        if (!this.fm.exists(path)) {
          return -ERRNO_CODES.ENOENT;
        }

        // Simulate success: file is accessible
        return 0;
      },
    );
    this.add("__syscall_fdatasync", "ii", (fd) => {
      const file = this.fm.getFile(fd);
      file.file.syncDataSync();
      return 0;
    });
    this.add("__syscall_fstat64", "iip", (fd, buf) => {
      const pgFile = this.fm.getFile(fd);

      let stat: Deno.FileInfo;
      let mode = 0;
      if ("statInfo" in pgFile.file) {
        stat = pgFile.file.statInfo;
        mode = stat.mode!;
      } else {
        if (!pgFile.file) {
          return -ERRNO_CODES.EBADF;
        }
        stat = Deno.statSync(pgFile.path);

        const _S_IFMT = 0o170000; // bitmask for the file type bitfields
        const S_IFDIR = 0o040000;
        const S_IFREG = 0o100000;
        const S_IFLNK = 0o120000;
        if (stat.isDirectory) mode |= S_IFDIR;
        else if (stat.isSymlink) mode |= S_IFLNK;
        else mode |= S_IFREG;
      }
      const now = new Date().getTime();
      this.pgMem.HEAP32[buf >> 2] = stat.dev;
      this.pgMem.HEAP32[(buf + 4) >> 2] = mode;
      this.pgMem.HEAPU32[(buf + 8) >> 2] = stat.nlink || 1;
      this.pgMem.HEAP32[(buf + 12) >> 2] = stat.uid || 0;
      this.pgMem.HEAP32[(buf + 16) >> 2] = stat.gid || 0;
      this.pgMem.HEAP32[(buf + 20) >> 2] = stat.rdev || 0;
      this.pgMem.HEAP64[(buf + 24) >> 3] = BigInt(stat.size);
      this.pgMem.HEAP32[(buf + 32) >> 2] = 4096;
      this.pgMem.HEAP32[(buf + 36) >> 2] = stat.blocks || 0;
      const atime = stat.atime?.getTime() || now;
      const mtime = stat.mtime?.getTime() || now;
      const ctime = stat.ctime?.getTime() || now;
      this.pgMem.HEAP64[(buf + 40) >> 3] = BigInt(Math.floor(atime / 1e3));
      this.pgMem.HEAPU32[(buf + 48) >> 2] = (atime % 1e3) * 1e3 * 1e3;
      this.pgMem.HEAP64[(buf + 56) >> 3] = BigInt(Math.floor(mtime / 1e3));
      this.pgMem.HEAPU32[(buf + 64) >> 2] = (mtime % 1e3) * 1e3 * 1e3;
      this.pgMem.HEAP64[(buf + 72) >> 3] = BigInt(Math.floor(ctime / 1e3));
      this.pgMem.HEAPU32[(buf + 80) >> 2] = (ctime % 1e3) * 1e3 * 1e3;
      this.pgMem.HEAP64[(buf + 88) >> 3] = BigInt(stat.ino || 1);

      return 0; // success
    });
    this.add("__syscall_ftruncate64", "iij", (fd, length) => {
      length = bigintToI53Checked(length);
      const pgFile = this.fm.getFile(fd);
      pgFile.file.truncateSync(length);
      return 0;
    });
    this.add("__syscall_truncate64", "ipj", (ptr, length) => {
      length = bigintToI53Checked(length);
      if (isNaN(length)) {
        return -ERRNO_CODES.EOVERFLOW;
      }
      let path = this.fm.getPtrPath(ptr);

      path = this.fm.parsePath(path);
      try {
        this.fm.truncateFile(path, length);
        return 0;
      } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
          return -ERRNO_CODES.ENOENT;
        }
        throw e;
      }
    });

    this.add("__syscall_getdents64", "iipp", (fd, dirp, count) => {
      const entries = this.fm.listDirFD(fd);
      const struct_size = 280;
      let pos = 0;
      const off = this.fm.dirReadOffsets.get(fd) || 0;
      const startIdx = Math.floor(off / struct_size);
      const endIdx = Math.min(
        entries.length,
        startIdx + Math.floor(count / struct_size),
      );
      let idx = startIdx;
      for (idx = startIdx; idx < endIdx; idx++) {
        const entry = entries[idx];
        const name = entry.name;
        const id = entry.stat.ino || 1;
        const type = entry.stat.isCharDevice
          ? 2
          : entry.stat.isDirectory
          ? 4
          : entry.stat.isSymlink
          ? 10
          : 8;

        this.pgMem.HEAP64[(dirp + pos) >> 3] = BigInt(id);
        this.pgMem.HEAP64[(dirp + pos + 8) >> 3] = BigInt(
          (idx + 1) * struct_size,
        );
        this.pgMem.HEAP16[(dirp + pos + 16) >> 1] = 280;
        this.pgMem.HEAP8[dirp + pos + 18] = type;
        this.pgMem.stringToUTF8(name, dirp + pos + 19, 256);
        pos += struct_size;
      }
      this.fm.dirReadOffsets.set(fd, idx * struct_size);
      return pos;
    });
    this.add("__syscall_ioctl", "iiip", (_fd, op, _varargs) => {
      switch (op) {
        case IOCTL.TIOCGWINSZ:
          return -ERRNO_CODES.ENOTTY;
        default:
          ni();
      }
      ni();
    });
    this.add("__syscall_lstat64", "ipp", (pathPointer, buf) => {
      let path = this.fm.getPtrPath(pathPointer);
      path = this.fm.parsePath(path);
      if (!this.fm.exists(path)) {
        return -ERRNO_CODES.ENOENT;
      }
      const stat = Deno.lstatSync(path);

      const now = new Date().getTime();
      this.pgMem.HEAP32[buf >> 2] = stat.dev;
      this.pgMem.HEAP32[(buf + 4) >> 2] = stat.mode || 0;
      this.pgMem.HEAPU32[(buf + 8) >> 2] = stat.nlink || 1;
      this.pgMem.HEAP32[(buf + 12) >> 2] = stat.uid || 0;
      this.pgMem.HEAP32[(buf + 16) >> 2] = stat.gid || 0;
      this.pgMem.HEAP32[(buf + 20) >> 2] = stat.rdev || 0;
      this.pgMem.HEAP64[(buf + 24) >> 3] = BigInt(stat.size);
      this.pgMem.HEAP32[(buf + 32) >> 2] = 4096;
      this.pgMem.HEAP32[(buf + 36) >> 2] = stat.blocks || 0;
      const atime = stat.atime?.getTime() || now;
      const mtime = stat.mtime?.getTime() || now;
      const ctime = stat.ctime?.getTime() || now;
      this.pgMem.HEAP64[(buf + 40) >> 3] = BigInt(Math.floor(atime / 1e3));
      this.pgMem.HEAPU32[(buf + 48) >> 2] = (atime % 1e3) * 1e3 * 1e3;
      this.pgMem.HEAP64[(buf + 56) >> 3] = BigInt(Math.floor(mtime / 1e3));
      this.pgMem.HEAPU32[(buf + 64) >> 2] = (mtime % 1e3) * 1e3 * 1e3;
      this.pgMem.HEAP64[(buf + 72) >> 3] = BigInt(Math.floor(ctime / 1e3));
      this.pgMem.HEAPU32[(buf + 80) >> 2] = (ctime % 1e3) * 1e3 * 1e3;
      this.pgMem.HEAP64[(buf + 88) >> 3] = BigInt(stat.ino || 1);

      return 0; // success
    });
    this.add(
      "__syscall_mkdirat",
      "iipi",
      (_dirfd, pathPointer, _mode) => {
        const path = this.fm.getPtrPath(pathPointer);
        return this.fm.mkdir(path);
      },
    );

    this.add("__syscall_pipe", "ip", (fdPtr) => {
      const { readableFD, writableFD } = this.fm.createPipe();

      // Simulate the pipe ends

      this.pgMem.HEAPU32[fdPtr >> 2] = readableFD;
      this.pgMem.HEAPU32[(fdPtr + 4) >> 2] = writableFD;

      return 0;
    });

    this.add(
      "__syscall_readlinkat",
      "iippp",
      (_dirfd, pathPointer, buf, bufsize) => {
        const path = this.fm.getPtrPath(pathPointer);
        const parsed = this.fm.parsePath(path);
        if (bufsize <= 0) return -28;

        const ret = parsed;
        const len = Math.min(bufsize, lengthBytesUTF8(ret));
        const endChar = this.pgMem.HEAP8[buf + len];
        this.pgMem.stringToUTF8(ret, buf, bufsize + 1);
        this.pgMem.HEAP8[buf + len] = endChar;
        return len;
      },
    );

    this.add(
      "__syscall_renameat",
      "iipip",
      (olddirfd, oldpath, newdirfd, newpath) => {
        if (olddirfd !== -100 || newdirfd !== -100) {
          ni("dirfd");
        }
        return this.fm.rename(oldpath, newpath);
      },
    );

    this.add("__syscall_stat64", "ipp", (pathPointer: number, buf) => {
      let path = this.fm.getPtrPath(pathPointer);

      path = this.fm.parsePath(path);
      this.fm.debugLog(`stat64: ${path}`);
      let stat: Deno.FileInfo;
      if (!this.fm.postgresFiles.has(path)) {
        if (!this.fm.exists(path)) {
          return -ERRNO_CODES.ENOENT;
        }
        stat = Deno.statSync(path);
      } else {
        const pgFile = this.fm.postgresFiles.get(path);
        if (!pgFile) {
          return -ERRNO_CODES.ENOENT;
        }
        stat = pgFile.statSync();
      }

      const now = new Date().getTime();
      this.pgMem.HEAP32[buf >> 2] = stat.dev;
      this.pgMem.HEAP32[(buf + 4) >> 2] = stat.mode || 0;
      this.pgMem.HEAPU32[(buf + 8) >> 2] = stat.nlink || 1;
      this.pgMem.HEAP32[(buf + 12) >> 2] = stat.uid || 0;
      this.pgMem.HEAP32[(buf + 16) >> 2] = stat.gid || 0;
      this.pgMem.HEAP32[(buf + 20) >> 2] = stat.rdev || 0;
      this.pgMem.HEAP64[(buf + 24) >> 3] = BigInt(stat.size);
      this.pgMem.HEAP32[(buf + 32) >> 2] = 4096;
      this.pgMem.HEAP32[(buf + 36) >> 2] = stat.blocks || 0;
      const atime = stat.atime?.getTime() || now;
      const mtime = stat.mtime?.getTime() || now;
      const ctime = stat.ctime?.getTime() || now;
      this.pgMem.HEAP64[(buf + 40) >> 3] = BigInt(Math.floor(atime / 1e3));
      this.pgMem.HEAPU32[(buf + 48) >> 2] = (atime % 1e3) * 1e3 * 1e3;
      this.pgMem.HEAP64[(buf + 56) >> 3] = BigInt(Math.floor(mtime / 1e3));
      this.pgMem.HEAPU32[(buf + 64) >> 2] = (mtime % 1e3) * 1e3 * 1e3;
      this.pgMem.HEAP64[(buf + 72) >> 3] = BigInt(Math.floor(ctime / 1e3));
      this.pgMem.HEAPU32[(buf + 80) >> 2] = (ctime % 1e3) * 1e3 * 1e3;
      this.pgMem.HEAP64[(buf + 88) >> 3] = BigInt(stat.ino || 1);

      return 0; // success
    });
    this.add("getaddrinfo", "ipppp", (_node, _service, _hint, _out) => {
      return -1;
    });
    this.add("proc_exit", "vi", (code) => {
      this.inPg.EXITSTATUS = code;
      throw new ExitStatus(code);
    });

    this.add("_abort_js", "v", () => this.inPg.abort(""));
    this.add("_dlopen_js", "pp", (ptr) => {
      // dlSetError(`Could not load dynamic lib: ${filename}\n${e}`);
      // return 0;
      let path = this.fm.getPtrPath(ptr + 36);
      const flags = this.pgMem.HEAP32[(ptr + 4) >> 2];
      path = this.fm.parsePath(path);
      const global = Boolean(flags & 256);
      const localScope = global ? null : {};
      const combinedFlags = {
        global,
        nodelete: Boolean(flags & 4096),
        loadAsync: false,
      };
      try {
        return this.loader.loadDynamicLibrary(
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
    this.add("_dlsym_js", "pppp", (handle, symbol, symbolIndex) => {
      symbol = this.pgMem.UTF8ToString(symbol);
      let result;
      const lib = this.loader.LDSO.loadedLibsByHandle[handle];
      if (
        !Object.prototype.hasOwnProperty.call(lib.exports, symbol) ||
        lib.exports[symbol].stub
      ) {
        return 0;
      }
      const newSymIndex = Object.keys(lib.exports).indexOf(symbol);
      result = lib.exports[symbol];
      if (typeof result == "function") {
        const addr = this.loader.getFunctionAddress(result);
        if (addr) {
          result = addr;
        } else {
          result = this.loader.addFunction(result, result.sig);
          this.pgMem.HEAPU32[symbolIndex >> 2] = newSymIndex;
        }
      }
      return result;
    });
    this.add("_emscripten_get_progname", "vpi", (str, len) => {
      return this.pgMem.stringToUTF8(this.inPg.getExecutableName(), str, len);
    });
    this.add("_emscripten_memcpy_js", "vppp", (dest, src, num) => {
      this.pgMem.HEAPU8.copyWithin(dest, src, src + num);
    });

    this.add("_emscripten_system", "ip", (command) => {
      if (!command) return 1;
      return 0 << 8;
    });
    this.add("_emscripten_throw_longjmp", "v", () => {
      throw Infinity;
    });

    this.add(
      "_mmap_js",
      "ipiiijpp",
      (len, _prot, _flags, fd, offset, allocatedPtr, addr) => {
        offset = bigintToI53Checked(offset);
        if (isNaN(offset)) return 61;
        const file = this.fm.getFile(fd);
        if (file.isMem) {
          const { ptr, allocated } = file.file.mmap(len, offset);
          this.pgMem.HEAP32[allocatedPtr >> 2] = allocated ? 1 : 0;
          this.pgMem.HEAPU32[addr >> 2] = ptr;
          return 0;
        }
        return ERRNO_CODES.EBADF;
      },
    );

    this.add("clock_time_get", "iijp", (clk_id, ignored_precision, ptime) => {
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
      this.pgMem.HEAP64[ptime >> 3] = BigInt(nsec);
      return 0;
    });
    this.add("emscripten_asm_const_int", "ippp", (
      code: number,
      sigPtr: number,
      argbuf: number,
    ) => {
      return this.inPg.runEmAsmFunction(code, sigPtr, argbuf);
    });
    this.add("emscripten_date_now", "d", () => {
      return Date.now();
    });

    this.add("emscripten_resize_heap", "ip", (requestedSize) => {
      const oldSize = this.pgMem.HEAPU8.length;
      requestedSize >>>= 0;
      const maxHeapSize = this.pgMem.getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
      for (let cutDown = 1; cutDown <= 4; cutDown *= 2) {
        let overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(
          overGrownHeapSize,
          requestedSize + 100663296,
        );
        const newSize = Math.min(
          maxHeapSize,
          this.pgMem.alignMemory(
            Math.max(requestedSize, overGrownHeapSize),
            65536,
          ),
        );
        const replacement = this.pgMem.growMemory(newSize);
        if (replacement) {
          return true;
        }
      }
      return false;
    });
    this.add("environ_get", "ipp", (__environ, environ_buf) => {
      let bufSize = 0;
      this.inPg.env.forEach((string, i) => {
        const ptr = environ_buf + bufSize;
        this.pgMem.HEAPU32[(__environ + i * 4) >> 2] = ptr;
        this.pgMem.stringToAscii(string, ptr);
        bufSize += string.length + 1;
      });
    });
    this.add(
      "environ_sizes_get",
      "ipp",
      (penviron_count, penviron_buf_size) => {
        const strings = this.inPg.env;
        this.pgMem.HEAPU32[penviron_count >> 2] = strings.length;
        let bufSize = 0;
        strings.forEach((string) => (bufSize += string.length + 1));
        this.pgMem.HEAPU32[penviron_buf_size >> 2] = bufSize;
        return 0;
      },
    );
    this.add("__cxa_throw", "vppp", (ptr, type, destructor) => {
      const info = new ExceptionInfo(ptr, this.pgMem);
      info.init(type, destructor);
      this.inPg.exceptionLast = ptr;
      this.inPg.uncaughtExceptionCount++;
      throw this.inPg.exceptionLast;
    });
    this.add("exit", "vi", (status, implicit) => {
      this.inPg.exitJS(status, implicit);
    });
    this.add("fd_close", "ii", (fd) => {
      return this.fm.closeFile(fd);
    });
    this.add("fd_fdstat_get", "iip", (fd, pbuf) => {
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
      this.pgMem.HEAP8[pbuf] = type;
      this.pgMem.HEAP16[(pbuf + 2) >> 1] = 0;
      this.pgMem.HEAP64[(pbuf + 8) >> 3] = 0n;
      this.pgMem.HEAP64[(pbuf + 16) >> 3] = 0n;
      return 0;
    });
    this.add("fd_pread", "iippjp", (fd, iov, iovcnt, offset, pnum) => {
      offset = bigintToI53Checked(offset);
      if (isNaN(offset)) return 61;

      const pgFile = this.fm.getFile(fd);
      if (!pgFile) return -1;
      const file = pgFile.file;
      const originalPos = file.seekSync(0, Deno.SeekMode.Current);

      let total = 0;

      for (let i = 0; i < iovcnt; i++) {
        const ptr = this.pgMem.HEAPU32[iov >> 2];
        const len = this.pgMem.HEAPU32[(iov + 4) >> 2];
        iov += 8;

        const buffer = new Uint8Array(len);
        file.seekSync(offset, Deno.SeekMode.Start);
        const bytesRead = file.readSync(buffer) ?? 0;

        this.pgMem.HEAPU8.set(buffer.subarray(0, bytesRead), ptr);

        total += bytesRead;
        if (bytesRead < len) break;
        offset += bytesRead;
      }

      file.seekSync(originalPos, Deno.SeekMode.Start);
      this.pgMem.HEAPU32[pnum >> 2] = total;

      return 0;
    });
    this.add("fd_pwrite", "iippjp", (fd, iov, iovcnt, offset, pnum) => {
      offset = bigintToI53Checked(offset);
      const pgFile = this.fm.getFile(fd);
      if (!pgFile) return -1;
      const file = pgFile.file;
      let total = 0;
      const originalPos = file.seekSync(0, Deno.SeekMode.Current);
      for (let i = 0; i < iovcnt; i++) {
        const ptr = this.pgMem.HEAPU32[iov >> 2];
        const len = this.pgMem.HEAPU32[(iov + 4) >> 2];
        iov += 8;
        const chunk = this.pgMem.HEAPU8.subarray(ptr, ptr + len);
        file.seekSync(offset, Deno.SeekMode.Start);
        const written = file.writeSync(chunk);
        offset += written;
        total += written;
      }
      file.seekSync(originalPos, Deno.SeekMode.Start);
      this.pgMem.HEAPU32[pnum >> 2] = total;
      return 0;
    });
    this.add("fd_read", "iippp", (fd, iov, iovcnt, pnum) => {
      const file = this.fm.getFile(fd);

      if (!file) {
        Deno.exit(1);
      }
      let bytesRead = 0;
      let dataOffset = 0;

      for (let i = 0; i < iovcnt; i++) {
        const ptr = this.pgMem.HEAPU32[iov >> 2];
        const len = this.pgMem.HEAPU32[(iov + 4) >> 2];
        iov += 8;
        const buffer = new Uint8Array(len);
        const readCount = file.file.readSync(buffer);

        if (readCount === null) {
          break;
        }
        const chunk = buffer.slice(0, readCount);
        this.pgMem.HEAPU8.set(chunk, ptr);

        bytesRead += chunk.length;
        dataOffset += chunk.length;

        if (chunk.length < len) break; // EOF
      }

      this.pgMem.HEAPU32[pnum >> 2] = bytesRead;

      return 0;
    });
    this.add(
      "fd_seek",
      "iijip",
      (fd, offset, whence, newOffsetPtr) => {
        offset = bigintToI53Checked(offset);
        const file = this.fm.getFile(fd);
        if (!file) return -1;
        const newPos = file.file.seekSync(offset, whence);

        this.pgMem.HEAPU32[newOffsetPtr >> 2] = newPos >>> 0;
        this.pgMem.HEAPU32[(newOffsetPtr + 4) >> 2] = (newPos / 2 ** 32) >>> 0;
        return 0;
      },
    );
    this.add("fd_sync", "ii", (fd) => {
      // return 0;
      const file = this.fm.getFile(fd);
      if (!file) {
        return -1;
      }
      if (this.fm.isWindows && file.info?.isDirectory) {
        return 0;
      }
      file.file.syncSync();
      return 0;
    });
    this.add("fd_write", "iippp", (fd, iov, iovcnt, pnum) => {
      let file;
      let std: "out" | "err" | null = null;
      switch (fd) {
        case 1:
          std = "out";
          break;
        case 2:
          std = "err";
          break;
        default:
          file = this.fm.getFile(fd);
      }

      let written = 0;
      for (let i = 0; i < iovcnt; i++) {
        const ptr = this.pgMem.HEAPU32[iov >> 2];
        const len = this.pgMem.HEAPU32[(iov + 4) >> 2];
        iov += 8;

        const chunk = this.pgMem.HEAPU8.slice(ptr, ptr + len);
        if (file) {
          const writtenLength = file!.file.writeSync(chunk);
          written += writtenLength;
        }
        if (std) {
          this.inPg.log(std, chunk);
          written += chunk.length;
        }
      }
      this.pgMem.HEAPU32[pnum >> 2] = written;

      return 0;
    });
  }
}
