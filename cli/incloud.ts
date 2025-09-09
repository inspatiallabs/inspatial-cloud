import { InLog } from "~/in-log/in-log.ts";
import convertString from "~/utils/convert-string.ts";
import { center } from "~/terminal/format-utils.ts";
import { RunManager } from "#cli/run-manager.ts";
import { syncEntryInterface } from "#cli/sync-entry-interface.ts";

export const cliLog: any = new InLog({
  consoleDefaultStyle: "full",
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
  const mainfile =
    `import { createInCloud, defineExtension, defineEntry } from "@inspatial/cloud";

const myEntry = defineEntry("myEntry",{
  label: "My Entry",
  description: "A sample entry type",
  titleField: "name",
  fields: [{
    key: "name",
    type: "DataField",
    required: true,
  }]
});

const myExtension = defineExtension("myExtension",{
  label: "My Extension",
  description: "A sample extension",
  entryTypes: [myEntry],
  settingsTypes: [],
  actionGroups: [],
});

createInCloud("${projectName}", [myExtension]);

`;
  return mainfile;
}

function doRun(rootPath: string, file?: string) {
  cliLog.info("Running InCloud project...");
  const runner = new RunManager(rootPath, file);
  runner.init();
}

async function doInit(_rootPath: string, projectName?: string) {
  if (!projectName) {
    cliLog.warn("Project name is required for initialization.");
    Deno.exit(1);
  }
  const folderName = convertString(projectName, "kebab", true);
  const name = convertString(folderName, "title", true);
  cliLog.warn(`Initializing project: ${name}`);

  // Create the project directory
  try {
    Deno.mkdirSync(folderName);
  } catch (e) {
    if (e instanceof Deno.errors.AlreadyExists) {
      cliLog.error(`Project directory ${folderName} already exists.`);
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
  try {
    const status = await proc.status;
    Deno.writeTextFileSync("main.ts", makeMainFile(projectName));
    if (status.success) {
      const cmd = new Deno.Command(Deno.execPath(), {
        args: ["cache", "--reload", "main.ts"],
      });
      await cmd.output();

      cliLog.info([
        `Project ${name} initialized successfully!`,
        "",
        "You can now run your project:",
        `cd ${folderName}`,
        `incloud run main.ts`,
      ]);
    } else {
      cliLog.error(`Failed to initialize project ${name}.`);
      Deno.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    cliLog.error(`Error initializing project: ${message}`);
    Deno.exit(1);
  }
}

async function init() {
  cliLog.setConfig({
    logTrace: false,
  });
  const rootPath = Deno.cwd();
  const { command, file } = parseArgs();
  if (command === undefined) {
    cliLog.warn(
      "No command provided. Please use 'incloud run <file>' or 'incloud init <project-name>'.",
      {
        compact: true,
      },
    );
  }
  switch (command) {
    case "run":
      doRun(rootPath, file);
      break;
    case "init":
      await doInit(rootPath, file);
      break;
    case "syncClient":
      await syncEntryInterface();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      Deno.exit(1);
  }
}
if (import.meta.main) {
  init();
}
