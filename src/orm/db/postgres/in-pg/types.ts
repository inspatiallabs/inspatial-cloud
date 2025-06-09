import type { MemFile } from "./src/memFile.ts";

export interface PGFileBase {
  path: string;
  info: Deno.FileInfo;
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
