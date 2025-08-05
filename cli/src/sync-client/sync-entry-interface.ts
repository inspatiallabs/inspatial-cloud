import { InCloudClient, InLiveClient } from "@inspatial/cloud-client";
import { cliLog } from "@inspatial/cloud/incloud";
import { joinPath } from "~/utils/path-utils.ts";
interface BaseOptions {
  host?: string;
  port?: number;
  onNotify?: (message: string) => void;
}
interface Credential {
  email: string;
  password: string;
}

interface TokenCredentials {
  token: string;
}

type Credentials = Credential | TokenCredentials;
const argsMap = new Map<string, string>(Object.entries({
  "-t": "token",
  "--token": "token",
  "-h": "host",
  "--host": "host",
  "-P": "port",
  "--port": "port",
  "-f": "filePath",
  "--filePath": "filePath",
}));

async function listenForEscapeKey(callback?: () => void) {
  Deno.stdin.setRaw(true);

  const escapeKey = new Uint8Array([27]); // Escape key in ASCII
  while (true) {
    const buffer = new Uint8Array(1);
    const bytesRead = await Deno.stdin.read(buffer);
    if (bytesRead === null) {
      break; // EOF
    }
    if (buffer[0] === escapeKey[0]) {
      console.log("Escape key pressed. Exiting...");
      Deno.stdin.setRaw(false);
      if (callback) {
        callback();
      }

      Deno.exit(0);
    }
  }
  Deno.stdin.setRaw(false); // Reset to normal mode
}
function parseArgs(): Map<string, string | boolean> {
  const argsRecord = new Map<string, string | boolean>();
  for (let i = 1; i < Deno.args.length; i++) {
    const arg = Deno.args[i];
    const nextArg = Deno.args[i + 1]?.trim();
    const parseArg = (trim: number) => {
      if (!nextArg.startsWith("-")) {
        argsRecord.set(arg.slice(trim), nextArg);
        i++; // Skip the next argument as it's the value for this flag
        return;
      }
      argsRecord.set(arg.slice(trim), true);
    };
    if (arg.startsWith("--")) {
      parseArg(2);
      continue;
    }
    if (arg.startsWith("-")) {
      parseArg(1);
      continue;
    }
  }
  return argsRecord;
}
export async function syncEntryInterface() {
  const args = parseArgs();
  const token = args.get("token") || args.get("t");
  let filePath = args.get("filePath") || args.get("f");
  if (typeof filePath === "boolean" || filePath === undefined) {
    filePath = Deno.cwd();
  }
  filePath = Deno.realPathSync(filePath);
  const file = joinPath(filePath, "cloudTypes.d.ts");
  let host = args.get("host") || args.get("h");
  if (typeof host === "boolean") {
    host = undefined; // If the host is set to true, we treat it as not provided
  }
  const port = args.get("port") || args.get("P");
  if (host && port) {
    host += `:${port}`;
  }
  if (!host) {
    host = `http://localhost:${port || "8000"}`;
  }
  if (!token || typeof token === "boolean") {
    cliLog.warn(
      "No credentials provided. Use --token <token>, or -t <token>",
      "MissingCredentialsError",
    );
    Deno.exit(1);
  }
  const inCloud = new InCloudClient(`${host}/api`);
  inCloud.headers.set("Authorization", `Bearer ${token}`);
  const writeClientFile = async () => {
    cliLog.warn("Syncing client interfaces", {
      compact: true,
      subject: "Sync",
    });
    const response = await fetch(
      `${host}/api?group=orm&action=getClientInterfaces
`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      },
    );
    const text = await response.text();
    Deno.writeTextFileSync(file, text, {
      create: true,
      append: false,
    });
    cliLog.info(`Client interfaces written to ${file}`, {
      compact: true,
      subject: "Sync",
    });
  };
  const session = await inCloud.auth.authCheck();
  if (!session) {
    cliLog.warn(
      "Session check failed. Please ensure your credentials are correct.",
    );
    Deno.exit(1);
  }
  cliLog.info(
    [
      `Connected to InCloud at ${host}`,
      `as ${session.firstName} ${session.lastName} (${session.email})`,
    ],
    "ConnectionSuccess",
  );
  const inLive = new InLiveClient(`${host}/ws`);
  writeClientFile();
  inLive.onConnectionStatus((status) => {
    switch (status) {
      case "reconnected":
        writeClientFile();
        break;
    }
  });
  inLive.start(token);

  listenForEscapeKey(() => {
    inLive.client.disconnect();
  }).catch((err) => {
    cliLog.error("Error listening for escape key:", err);
  });
}
