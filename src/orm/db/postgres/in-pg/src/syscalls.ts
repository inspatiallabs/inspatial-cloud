import { type InPG, ni } from "../in-pg.ts";
import { ERRNO_CODES, IOCTL } from "./constants.ts";
import { bigintToI53Checked, lengthBytesUTF8 } from "./convert.ts";
import type { PGMem } from "./pgMem.ts";

export class SysCalls {
  DEFAULT_POLLMASK: number;
  inPg: InPG;
  pgMem: PGMem;
  varargs?: number;
  methods: Map<string, Function>;
  get fm() {
    return this.inPg.fileManager;
  }

  constructor(inPg: InPG) {
    this.DEFAULT_POLLMASK = 5;
    this.inPg = inPg;
    this.pgMem = inPg.pgMem;
    this.methods = new Map();
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
      let message = name + ": " + params;

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

    this.add("__syscall_fcntl64", "iiip", (fd: number, cmd, varargs) => {
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
        case 4: {
          // ni();
          var arg = this.syscallGetVarargI();
          this.fm.debugLog({
            O_APPEND: 0x400,
            O_NONBLOCK: 0x800,
            O_SYNC: 0x101000,
          });
          this.fm.debugLog({ arg });
          return 0;
        }
        case 12: {
          var arg = this.syscallGetVarargP();
          var offset = 0;
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
      "__syscall_getsockname",
      "",
      (fd, level, optname, optval, optlen, d1) => {
        ni();
      },
    );
    this.add(
      "__syscall_getsockopt",
      "iiiippi",
      (fd, level, optname, optval, optlen, d1) => {
        ni();
      },
    );

    this.add(
      "__syscall_openat",
      "iipip",
      (dirfd, pathPointer, flags, varargs) => {
        const O_ACCMODE = 0b11;
        const O_CREAT = 0x40;
        const O_APPEND = 0x400;
        const O_TRUNC = 0x200;

        const path = this.fm.getPtrPath(pathPointer);
        const accessMode = flags & O_ACCMODE;
        const mode = varargs ? this.pgMem.HEAP32[+varargs >> 2] : 0;

        const create = !!(flags & O_CREAT);
        const append = !!(flags & O_APPEND);
        const truncate = !!(flags & O_TRUNC);

        try {
          const file = this.fm.openFile(path, {
            mode,
            create,
            append,
            truncate,
            read: accessMode === 0 || accessMode === 2,
            write: accessMode === 1 || accessMode === 2,
          });
          this.fm.debugLog(file.fd.toString() + " " + path);
          return file.fd;
        } catch (e) {
          if (e instanceof Deno.errors.NotFound) {
            return -ERRNO_CODES.ENOENT;
          }
          throw e;
        }
      },
    );
    this.add("__syscall_socket", "iiiiiii", (domain, type, protocol) => {
      ni();
    });

    this.add("__syscall_rmdir", "ip", (pathPointer: number) => {
      ni();
    });

    this.add("__syscall_unlinkat", "iipi", (dirfd, pathPointer, flags) => {
      return this.fm.unlinkat(dirfd, pathPointer, flags);
    });
    this.add("__syscall_fallocate", "iiijj", (fd, mode, offset, len) => {
      ni();
    });
    this.add("__syscall_fadvise64", "iijji", () => {
      return 0;
    });
    this.add("__syscall__newselect", "iipppp", () => {
      ni();
    });
    this.add("__syscall_bind", "iippiii", () => {
      ni();
    });
    this.add("__syscall_chmod", "ipi", () => {
      ni();
    });
    this.add("__syscall_connect", "iippiii", () => {
      ni();
    });
    this.add("__syscall_dup", "ii", (fd) => {
      return this.fm.dupe(fd);
    });
    this.add("__syscall_dup3", "iiii", (fd, newfd, flags) => {
      if (fd === newfd) {
        return -ERRNO_CODES.EINVAL;
      }
      return this.fm.dupe3(fd, newfd, flags);
    });
    this.add(
      "__syscall_faccessat",
      "iipii",
      (dirfd, pathPointer, amode, flags) => {
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

      const stat = Deno.statSync(pgFile.path);
      let mode = 0;
      const S_IFMT = 0o170000; // bitmask for the file type bitfields
      const S_IFDIR = 0o040000;
      const S_IFREG = 0o100000;
      const S_IFLNK = 0o120000;
      if (stat.isDirectory) mode |= S_IFDIR;
      else if (stat.isSymlink) mode |= S_IFLNK;
      else mode |= S_IFREG;
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
      // return 0;
      length = bigintToI53Checked(length);
      const pgFile = this.fm.getFile(fd);
      pgFile.file.truncateSync(length);
      return 0;
    });
    this.add("__syscall_getcwd", "ipp", () => {
      ni();
    });
    this.add("__syscall_getdents64", "iipp", (fd, dirp, count) => {
      const entries = this.fm.listDirFD(fd);
      var struct_size = 280;
      var pos = 0;
      var off = this.fm.dirReadOffsets.get(fd) || 0;
      var startIdx = Math.floor(off / struct_size);
      var endIdx = Math.min(
        entries.length,
        startIdx + Math.floor(count / struct_size),
      );
      for (var idx = startIdx; idx < endIdx; idx++) {
        var type;
        let entry = entries[idx];
        var name = entry.name;
        var id = entry.stat.ino || 1;
        type = entry.stat.isCharDevice
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
    this.add("__syscall_ioctl", "iiip", (fd, op, varargs) => {
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
      (dirfd, pathPointer, mode) => {
        const path = this.fm.getPtrPath(pathPointer);

        return this.fm.mkdir(path);
      },
    );
    this.add("__syscall_newfstatat", "iippi", () => {
      ni();
    });
    this.add("__syscall_pipe", "ip", (fdPtr) => {
      const { readableFD, writableFD } = this.fm.createPipe();

      // Simulate the pipe ends

      this.pgMem.HEAPU32[fdPtr >> 2] = readableFD;
      this.pgMem.HEAPU32[(fdPtr + 4) >> 2] = writableFD;

      return 0;
    });
    this.add("__syscall_poll", "ipii", () => {
      ni();
    });
    this.add(
      "__syscall_readlinkat",
      "iippp",
      (dirfd, pathPointer, buf, bufsize) => {
        const path = this.fm.getPtrPath(pathPointer);
        const parsed = this.fm.parsePath(path);
        if (bufsize <= 0) return -28;

        var ret = parsed;
        var len = Math.min(bufsize, lengthBytesUTF8(ret));
        var endChar = this.pgMem.HEAP8[buf + len];
        this.pgMem.stringToUTF8(ret, buf, bufsize + 1);
        this.pgMem.HEAP8[buf + len] = endChar;
        return len;
      },
    );
    this.add("__syscall_recvfrom", "iippipp", () => {
      ni();
    });
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
    this.add("__syscall_sendto", "iippipp", () => {
      ni();
    });
    this.add("__syscall_stat64", "ipp", (pathPointer: number, buf) => {
      let path = this.fm.getPtrPath(pathPointer);
      console.log({ path });
      path = this.fm.parsePath(path);
      console.log({ path });
      if (!this.fm.exists(path)) {
        return -ERRNO_CODES.ENOENT;
      }
      const stat = Deno.statSync(path);

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
      "__syscall_symlinkat",
      "ipip",
      () => {
        ni();
      },
    );
    this.add("__syscall_truncate64", "ipj", () => {
      ni();
    });
  }
}
