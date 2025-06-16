import type { MemFile } from "./src/memFile.ts";

export interface PGFileBase {
  path: string;
  info?: Deno.FileInfo;
  fd: number;
  isMem: boolean;
}
export interface PGFile extends PGFileBase {
  file: Deno.FsFile;
  isMem: false;
}
export interface PGFileMem extends PGFileBase {
  file: MemFile;
  devType: DevType | null;
  isMem: true;
}
export type DevType = "shm" | "tty" | "tmp" | "urandom";

export interface InPgOptions {
  env: Record<string, any>;
  args: Array<string>;
  installDir: string;
  debug?: boolean;
  onStderr?: (out: Output | OutputMore) => void;
  onStdout?: (out: Output | OutputMore) => void;
}

export interface Output {
  message: string;
}
export interface OutputMore {
  message: string;
  type: string;
  date: string;
  time: string;
}
