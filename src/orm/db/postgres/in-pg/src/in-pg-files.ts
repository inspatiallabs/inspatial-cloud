import { type InPG, ni } from "../in-pg.ts";
import type { DevType, PGFile, PGFileMem } from "../types.ts";
import { ERRNO_CODES } from "./constants.ts";
import { normalizePath } from "./convert.ts";
import { MemFile, PostgresFile } from "./memFile.ts";
import type { PGMem } from "./pgMem.ts";

export class FileManager {
  openFiles: Map<number, PGFile | PGFileMem>;
  openTmpFDs: Map<string, number>;
  mem: PGMem;
  inPg: InPG;
  #cwd: string = "/";
  debug?: boolean;
  #currFD: number;
  dirReadOffsets: Map<number, number>;
  debugFile?: Deno.FsFile;
  tmpMap: Map<string, string>;
  lastDebugMessage: string;
  messageCount: number = 0;
  pgFilesDir: string;
  tmDir!: string;
  postgresFiles: Map<string, PostgresFile>;
  constructor(inPg: InPG, options: {
    debug?: boolean;
    pgFilesDir: string;
  }) {
    this.lastDebugMessage = "";
    this.dirReadOffsets = new Map();
    this.debug = options?.debug;
    this.pgFilesDir = options.pgFilesDir;
    this.#currFD = 100;
    this.inPg = inPg;
    this.mem = inPg.pgMem;
    this.openFiles = new Map();
    this.openTmpFDs = new Map();
    this.postgresFiles = new Map();
    this.clearTmp();

    this.tmpMap = new Map();
    if (this.debug) {
      this.debugFile = Deno.openSync(Deno.cwd() + "/debug.log", {
        create: true,
        write: true,
        truncate: true,
      });
    }
    this.init();
  }

  init() {
    this.loadPostgresFiles();
    this.setupStdStreams();
  }
  clearTmp() {
    let path = Deno.makeTempFileSync();
    if (Deno.build.os === "windows") {
      const driveLetter = path.match(/^[a-zA-Z]:/)?.[0] || "";
      path = `${driveLetter}${normalizePath(path)}`;
    }
    Deno.removeSync(path);
    const parts = path.split("/");
    parts.pop();
    const tmpdir = parts.join("/");
    for (const item of Deno.readDirSync(tmpdir)) {
      if (item.isDirectory && item.name.startsWith("inspatial_")) {
        const fullPath = `${tmpdir}/${item.name}`;
        Deno.removeSync(fullPath, {
          recursive: true,
        });
      }
    }
    let tmDir = Deno.makeTempDirSync({
      prefix: "inspatial_",
    });

    if (Deno.build.os === "windows") {
      const driveLetter = tmDir.match(/^[a-zA-Z]:/)?.[0] || "";
      tmDir = `${driveLetter}${normalizePath(tmDir)}`;
    }
    this.tmDir = tmDir;
  }
  debugLog(message: string | object) {
    if (!this.debug) {
      return;
    }
    if (!this.debugFile) {
      return;
    }
    if (typeof message === "object") {
      message = JSON.stringify(message);
    }
    if (message == this.lastDebugMessage) {
      let seek = -8;
      if (this.messageCount === 0) {
        seek = -1;
      }
      this.messageCount += 1;
      const offset = this.debugFile.seekSync(seek, Deno.SeekMode.Current);
      const out = this.messageCount.toString().padStart(4, "0");
      const written = this.debugFile.writeSync(
        new TextEncoder().encode(" (" + out + ")\n"),
      );
    } else {
      this.messageCount = 0;
      const output = new TextEncoder().encode(message + "\n");
      this.debugFile.writeSync(output);
    }
    this.lastDebugMessage = message;
  }
  dupe(stdin: number) {
    if (stdin !== 0) {
      ni("dupe not stdin");
    }

    const newFD = this.nextFD();

    return newFD;
  }
  createPipe() {
    const readableFD = this.nextFD();

    const writableFD = this.nextFD();
    return {
      writableFD,
      readableFD,
    };
  }

  dupe3(contentfd: number, stdinfd: number) {
    const contentFile = this.getFile(contentfd);
    const tmpPath = this.tmpMap.get(contentFile.path);
    const newContentFile = Deno.openSync(tmpPath || contentFile.path);
    this.openFiles.set(stdinfd, {
      fd: stdinfd,
      isMem: false,
      path: tmpPath || contentFile.path,
      file: newContentFile,
    });
    return 0;
  }
  setupStdStreams() {
    const stdin = new MemFile(this.mem, "tmp", this.debug);

    this.openFiles.set(0, {
      fd: 0,
      file: stdin,
      path: "/tmp/stdin",
      info: stdin.statSync(),
      isMem: true,
      devType: "tmp",
    });

    this.openTmpFDs.set("/tmp/stdin", 0);
  }
  getFile(fd: number): PGFile | PGFileMem {
    if (!this.openFiles.has(fd)) {
      this.raise(`no file with file descriptor ${fd}`);
    }
    return this.openFiles.get(fd)!;
  }
  #openMemFile(type: string, path: string): MemFile {
    const fd = this.openTmpFDs.get(path);
    if (fd === undefined) {
      return new MemFile(this.mem, type, this.debug);
    }
    const memFile = this.openFiles.get(fd) as PGFileMem;

    if (memFile) {
      memFile.file.pos = 0;
      return memFile.file as MemFile;
    }
    return new MemFile(this.mem, type, this.debug);
  }
  openTmpFile(path: string, options: Deno.OpenOptions) {
    if (this.postgresFiles.has(path)) {
      const pgFile = this.postgresFiles.get(path)!;
      pgFile.position = 0;
      return pgFile;
    }
    let realPath = this.tmpMap.get(path);
    if (!realPath) {
      realPath = Deno.makeTempFileSync({
        dir: this.tmDir,
      });
      if (Deno.build.os === "windows") {
        const driveLetter = realPath.match(/^[a-zA-Z]:/)?.[0] || "";
        realPath = `${driveLetter}${normalizePath(realPath)}`;
      }
      this.tmpMap.set(path, realPath);
    }
    return Deno.openSync(realPath, options);
  }
  openFile(path: string, options: Deno.OpenOptions) {
    path = this.parsePath(path);
    const devType = this.isDev(path);

    let file: Deno.FsFile | MemFile;
    let isMem = false;
    switch (devType) {
      case "urandom":
        file = this.#openMemFile(devType, path);
        isMem = true;
        break;
      case "tmp":
        file = this.openTmpFile(path, options);
        break;
      case "shm":
        file = this.#openMemFile(devType, path);
        isMem = true;
        break;
      case null:
        file = Deno.openSync(path, options);
        break;
      default:
        throw new Error("no dev");
    }

    const fd = this.nextFD();
    if (devType == "shm") {
      this.openTmpFDs.set(path, fd);
    }
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
      try {
        file.file.close();
      } catch (e) {
        console.warn(e);
      }

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
    path = this.parsePath(path);
    if (!path.startsWith("/")) {
      path = this.join(this.cwd, path);
    }
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
    throw new Error(errorType);
  }
  /** List a directory base on a file descriptor */
  listDirFD(
    fd: number,
  ): Array<{ stat: Deno.FileInfo; name: string; fullPath: string }> {
    const dir = this.getFile(fd);
    if (!dir.info?.isDirectory) {
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
  loadPostgresFiles() {
    const data = Deno.readFileSync(`${this.pgFilesDir}/src/inpg.data`);
    let offset = 0;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    while (offset + 8 <= data.length) {
      const fileNameSize = view.getUint32(offset);
      const fileDataSize = view.getUint32(offset + 4);

      const nameStart = offset + 8;
      const nameEnd = nameStart + fileNameSize;

      const dataStart = nameEnd;
      const dataEnd = dataStart + fileDataSize;

      if (dataEnd > data.length) break;

      const fileName = new TextDecoder().decode(data.slice(nameStart, nameEnd));
      const fileData = data.slice(dataStart, dataEnd);
      this.postgresFiles.set(fileName, new PostgresFile(fileData));

      offset = dataEnd;
    }
  }
}
