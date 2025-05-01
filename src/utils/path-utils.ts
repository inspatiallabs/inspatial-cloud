export const OS = Deno.build.os;
export const IS_WINDOWS = OS === "windows";
export const IS_DARWIN = OS === "darwin";
export const IS_LINUX = OS === "linux";
export const IS_UNIX = IS_DARWIN || IS_LINUX;

/**
 * Joins multiple path segments into a single path.
 * The path segments are joined with a forward slash (/) regardless of the OS.
 */
export function joinPath(...paths: string[]): string {
  const path = paths.join("/");
  if (IS_WINDOWS) {
    return path.replace(/\\/g, "/");
  }
  return path;
}

export function normalizePath(path: string, options?: {
  /**
   * Whether to drop the file name at the end of the path and return only the directory name.
   */
  toDirname?: boolean;
}): string {
  path = path.replace("file:///", IS_UNIX ? "/" : "");
  path = decodeURIComponent(path);
  path = IS_WINDOWS ? path.replace(/\\/g, "/") : path;
  if (options?.toDirname) {
    path = path.replace(/\/[\w\s]*\.\w*$/, "");
  }
  return path;
}
