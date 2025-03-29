export async function formatInterfaceFile(filePath: string): Promise<boolean> {
  const process = new Deno.Command(Deno.execPath(), {
    args: ["fmt", filePath],
  }).spawn();
  const status = await process.status;
  return status.success;
}
export async function writeInterfaceFile(
  filePath: string,
  content: string,
): Promise<void> {
  await Deno.writeTextFile(filePath, content);
}
