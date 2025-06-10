import { type InPG, ni } from "../in-pg.ts";
import type { PGFile, PGFileMem } from "../types.ts";
import { ERRNO_CODES } from "./constants.ts";
import { normalizePath } from "./convert.ts";
import { MemFile } from "./memFile.ts";
import type { PGMem } from "./pgMem.ts";

export class FileManager {
  openFiles: Map<number, PGFile | PGFileMem>;
  mem: PGMem;
  inPg: InPG;
  #cwd: string = "/";
  debug?: boolean;
  stdOut!: WritableStreamDefaultWriter<Uint8Array>;
  stdErr!: WritableStreamDefaultWriter<Uint8Array>;
  #currFD: number;
  dirReadOffsets: Map<number, number>;
  constructor(inPg: InPG, options?: {
    debug?: boolean;
  }) {
    this.dirReadOffsets = new Map();
    this.debug = options?.debug;
    this.#currFD = 100;
    this.inPg = inPg;
    this.mem = inPg.pgMem;
    this.openFiles = new Map();
    this.init();
  }

  init() {
    this.setupStdStreams();
  }
  dupe(fd: number) {
    const file = this.openFiles.get(fd);
    if (!file) {
      throw new Error("no file");
    }
    const newFD = this.nextFD();
    this.openFiles.set(newFD, file);
    return newFD;
  }
  dupe3(oldFD: number, newFD: number) {
    const file = this.openFiles.get(oldFD);
    if (!file) {
      return -ERRNO_CODES.EEXIST;
    }
    this.closeFile(newFD);
    this.openFiles.set(newFD, file);
    this.openFiles.delete(oldFD);
    return 0;
  }
  setupStdStreams() {
    const stdin = new MemFile(this.mem, "tty", this.debug);
    const stdout = new MemFile(this.mem, "tty", this.debug);
    const stderr = new MemFile(this.mem, "tty", this.debug);
    this.openFiles.set(0, {
      fd: 0,
      isMem: true,
      devType: "tty",
      file: stdin,
      path: "/dev/tty",
      info: stdin.statSync(),
    });
    this.openFiles.set(1, {
      fd: 0,
      isMem: true,
      devType: "tty",
      file: stdout,
      path: "/dev/tty",
      info: stdin.statSync(),
    });
    this.openFiles.set(2, {
      fd: 0,
      isMem: true,
      devType: "tty",
      file: stderr,
      path: "/dev/tty",
      info: stdin.statSync(),
    });
  }

  getFile(fd: number): PGFile | PGFileMem {
    if (!this.openFiles.has(fd)) {
      this.raise(`no file with file descriptor ${fd}`);
    }
    return this.openFiles.get(fd)!;
  }
  #openMemFile(type: string): MemFile {
    const memFile = new MemFile(this.mem, type);
    return memFile;
  }
  openFile(path: string, options: Deno.OpenOptions) {
    const devType = this.isDev(path);
    path = this.parsePath(path);

    let file: Deno.FsFile | MemFile;
    let isMem = false;
    switch (devType) {
      case "tmp":
      case "shm":
      case "urandom":
        file = this.#openMemFile(devType);
        isMem = true;
        break;
      case null:
        file = Deno.openSync(path, options);
        break;
      default:
        throw new Error("no dev");
    }

    const fd = this.nextFD();

    this.openFiles.set(fd, {
      fd,
      file,
      info: file.statSync(),
      path,
      devType,
      isMem,
    } as any);

    return this.openFiles.get(fd)!;
  }
  closeFile(ptr: number) {
    this.dirReadOffsets.delete(ptr);
    const file = this.openFiles.get(ptr);
    if (file) {
      if (file.isMem) {
        return 0;
      }
      file.file.close();

      this.openFiles.delete(ptr);
    }
    return 0;
  }
  nextFD() {
    while (true) {
      const newFd = this.#currFD++;
      if (!this.openFiles.has(newFd)) {
        return newFd;
      }
    }
  }
  get cwd() {
    return this.#cwd;
  }
  chdirPtr(ptr: number) {
    const path = this.mem.getStr(ptr);
    return this.chdir(path);
  }
  chdir(path: string) {
    if (!path.startsWith("/")) {
      path = this.join(this.cwd, path);
    }
    path = this.parsePath(path);
    try {
      const result = Deno.statSync(path);
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return -ERRNO_CODES.ENOENT;
      }
      throw e;
    }
    this.#cwd = path;
    return 0;
  }
  getPtrPath(pointer: number) {
    let path = this.mem.getStr(pointer);

    return path;
  }
  unlinkat(dirfd: number, fd: number, flags: number) {
    if (dirfd !== -100) {
      ni("not -100");
    }
    let path = this.getPtrPath(fd);
    this.closeFile(fd);
    if (!this.exists(path)) {
      return -ERRNO_CODES.ENOENT;
    }
    path = this.parsePath(path);
    switch (flags) {
      case 0:
        Deno.removeSync(path);
        break;
      default:
        console.log(flags);
        ni("bad flag");
    }

    return 0;
  }
  rename(oldptr: number, newPtr: number) {
    let oldPath = this.getPtrPath(oldptr);
    let newPath = this.getPtrPath(newPtr);
    oldPath = this.parsePath(oldPath);
    newPath = this.parsePath(newPath);

    if (!this.exists(oldPath)) {
      return -ERRNO_CODES.ENOENT;
    }
    // if (this.exists(newPath)) {
    //   return -ERRNO_CODES.EEXIST;
    // }
    Deno.renameSync(oldPath, newPath);
    return 0;
    // Deno.renameSync()
  }
  parsePath(path: string) {
    path = normalizePath(path);
    switch (path) {
      case "":
        path = this.cwd;
        break;
      case "/":
        break;
      default:
        if (path.startsWith("/")) {
          break;
        }
        path = this.join(this.cwd, path);
        break;
    }

    return path;
  }
  resolvePath(path: string) {
    path = this.parsePath(path);
    try {
      Deno.statSync(path);
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return false;
      }
      throw e;
    }
    return path;
  }
  exists(path: string) {
    path = this.parsePath(path);

    try {
      Deno.statSync(path);
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return false;
      }
      console.log(e);
      Deno.exit(1);
    }
    return true;
  }
  mkdir(path: string) {
    path = this.parsePath(path);
    if (
      path.includes("/tmp") ||
      path.includes("/dev") ||
      path === "/"
    ) {
      return -ERRNO_CODES.EEXIST;
    }
    if (this.exists(path)) {
      return -ERRNO_CODES.EEXIST;
    }
    Deno.mkdirSync(path);
  }
  join(...parts: string[]) {
    return parts.join("/").replaceAll("\\", "/");
  }
  raise(errorType: string): never {
    throw new FMError(errorType);
  }
  /** List a directory base on a file descriptor */
  listDirFD(
    fd: number,
  ): Array<{ stat: Deno.FileInfo; name: string; fullPath: string }> {
    const dir = this.getFile(fd);
    if (!dir.info.isDirectory) {
      this.raise(`${dir.path} is not a directory!`);
    }
    const results = [];
    for (const entry of Deno.readDirSync(dir.path)) {
      const fullPath = `${dir.path}/${entry.name}`;

      const fileInfo = Deno.statSync(fullPath);
      results.push({
        stat: fileInfo,
        name: entry.name,
        fullPath,
      });
    }
    return results;
  }
  isDev(path: string): DevType | null {
    const match = path.match(/(^\/dev)\/(?<devtype>\w*)/);
    if (match) {
      const devtype = match.groups?.devtype;
      return devtype as DevType;
    }
    if (path.startsWith("/tmp")) {
      return "tmp";
    }
    return null;
  }
}
