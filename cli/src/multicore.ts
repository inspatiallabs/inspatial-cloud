/**
 * Get the number of CPU cores available on the system.
 *
 * **Note:** This function is currently only implemented for Linux systems.
 * If you are using a different OS, it will return 1.
 */
export async function getCoreCount(
  config?: { single?: boolean },
): Promise<number> {
  const { single = false } = config || {};
  if (single) return 1;
  if (Deno.build.os !== "linux") {
    return 1;
  }

  const cmd = new Deno.Command("nproc", {
    stdout: "piped",
  });

  const proc = cmd.spawn();

  const output = await proc.output();
  const cors = new TextDecoder().decode(output.stdout).trim();
  const coreCount = parseInt(cors);
  return isNaN(coreCount) ? 1 : coreCount;
}
