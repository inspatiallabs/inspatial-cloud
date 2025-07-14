export async function allowPortBinding() {
  if (Deno.build.os !== "linux") {
    throw new Error("This function is only supported on Linux");
  }

  const cmd = new Deno.Command("sudo", {
    args: ["setcap", "cap_net_bind_service=+ep", Deno.execPath()],
    stderr: "piped",
  });
  const child = cmd.spawn();
  const output = await child.output();

  if (output.code !== 0) {
    throw new Error(new TextDecoder().decode(output.stderr));
  }
  return output.code;
}
