import { InLog } from "~/in-log/in-log.ts";
import { RunManager } from "./src/run-manager.ts";
import convertString from "~/utils/convert-string.ts";
import { center } from "~/terminal/format-utils.ts";

const inLog = new InLog({
  consoleDefaultStyle: "compact",
  name: "InSpatial CLI",
  traceOffset: 1,
});
function parseArgs() {
  let command: string | undefined;
  let lastArg: string | undefined;
  const args: string[] = [];
  Deno.args.forEach((arg, index) => {
    if (index === 0) {
      command = arg;
      return; // Skip the first argument which is the command
    }
    if (index === Deno.args.length - 1) {
      lastArg = arg; // Last argument is the file
      return;
    }
    args.push(arg);
  });

  const file = lastArg;
  return {
    command,
    file,
    args,
  };
}

function makeMainFile(projectName: string) {
  const mainfile = `import { createInCloud } from "@inspatial/cloud";

createInCloud({
  name: "${projectName}",
  description: "My InCloud Project",
  entryTypes: [], // Define your entry types here
  settingsTypes: [], // Define your settings types here
  actionGroups: [], // Define your API action groups here
});

`;
  return mainfile;
}

function doRun(rootPath: string, file?: string) {
  inLog.info("Running InCloud project...");
  const runner = new RunManager(rootPath, file);
  runner.init();
}

function doInit(_rootPath: string, projectName?: string) {
  if (!projectName) {
    inLog.warn("Project name is required for initialization.");
    Deno.exit(1);
  }
  const folderName = convertString(projectName, "kebab", true);
  const name = convertString(folderName, "title", true);
  inLog.warn(`Initializing project: ${name}`);

  // Create the project directory
  try {
    Deno.mkdirSync(folderName);
  } catch (e) {
    if (e instanceof Deno.errors.AlreadyExists) {
      inLog.error(`Project directory ${folderName} already exists.`);
      Deno.exit(1);
    }
  }
  Deno.chdir(folderName);
  Deno.writeTextFileSync(
    "deno.json",
    JSON.stringify(
      {},
      null,
      2,
    ),
  );
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["add", "jsr:@inspatial/cloud"],
    stdout: "piped",
    stderr: "piped",
  });

  const proc = cmd.spawn();

  proc.stdout.pipeTo(
    new WritableStream({
      write(chunk) {
        console.log(center(new TextDecoder().decode(chunk)));
      },
    }),
  );
  proc.stderr.pipeTo(
    new WritableStream({
      write(chunk) {
        console.log(center(new TextDecoder().decode(chunk)));
      },
    }),
  );
  proc.status.then((status) => {
    Deno.writeTextFileSync("main.ts", makeMainFile(projectName));
    if (status.success) {
      inLog.info([
        `Project ${name} initialized successfully!`,
        "",
        "You can now run your project:",
        `cd ${folderName}`,
        `incloud run main.ts`,
      ]);
    } else {
      inLog.error(`Failed to initialize project ${name}.`);
      Deno.exit(1);
    }
  }).catch((err) => {
    inLog.error(`Error initializing project: ${err.message}`);
    Deno.exit(1);
  });
}

function init() {
  inLog.setConfig({
    logTrace: false,
  });
  const rootPath = Deno.cwd();
  const { command, file } = parseArgs();
  switch (command) {
    case "run":
      doRun(rootPath, file);
      break;
    case "init":
      doInit(rootPath, file);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      Deno.exit(1);
  }
}

init();
