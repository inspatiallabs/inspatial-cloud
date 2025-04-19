/**
 * Joins multiple path segments into a single path.
 * The path segments are joined with a forward slash (/) regardless of the OS.
 */
export function joinPath(...paths: string[]): string {
  const path = paths.join("/");
  if (Deno.build.os === "windows") {
    return path.replace(/\\/g, "/");
  }
  return path;
}
