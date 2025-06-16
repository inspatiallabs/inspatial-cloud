import { hasDirectory } from "#/utils/file-handling.ts";
import type { InCloud } from "#/inspatial-cloud.ts";
import type { ConfigEnv } from "#types/serve-types.ts";
import type { CloudExtensionInfo } from "#/app/types.ts";
import ColorMe from "#/utils/color-me.ts";
import { generateConfigSchema } from "#/cloud-config/cloud-config.ts";
import { joinPath } from "#/utils/path-utils.ts";

export function initCloud(app: InCloud): void {
  if (hasDirectory(app.inRoot)) {
    return;
  }
  const filePath = joinPath(app.appRoot, "cloud-config.json");
  app.inLog.warn(
    "Cloud has not been initialized yet. Initializing now...",
    "Cloud Init",
  );
  const masterConfig = new Map<string, Record<string, any>>();
  app.installedExtensions.forEach((extension) => {
    const configResult = promptForConfig(extension);
    masterConfig.set(extension.key, configResult);
  });

  const config = {
    $schema: ".inspatial/cloud-config-schema.json",
    ...Object.fromEntries(masterConfig),
  };

  const file = JSON.stringify(config, null, 2);
  Deno.writeTextFileSync(filePath, file);
  generateConfigSchema(app);
  app.inLog.info(
    "Cloud initialized successfully. Please restart the app",
    "Cloud Init",
  );
  Deno.exit(0);
}

function promptForConfig(extension: CloudExtensionInfo) {
  // console.log(extension.label);
  const configResults = new Map<string, any>();
  const dependencies = new Map<string, ConfigEnv>();
  for (const [key, env] of Object.entries(extension.config)) {
    if (env.dependsOn) {
      dependencies.set(key, env);
      continue;
    }
    const output = promptConfigValue(key, env);
    configResults.set(env.env!, output);
  }
  for (const [key, env] of dependencies) {
    const dependencyKey = extension.config[env.dependsOn!.key]?.env;
    if (!dependencyKey) {
      throw new Error(
        `Dependency key ${env.dependsOn!.key} not found in config`,
      );
    }
    const dependencyValue = configResults.get(dependencyKey);
    if (dependencyValue !== env.dependsOn!.value) {
      continue;
    }
    const output = promptConfigValue(key, env);
    configResults.set(env.env!, output);
  }

  const results = Object.fromEntries(configResults);
  return results;
  // console.log(extension.config);
}

function promptConfigValue(key: string, env: ConfigEnv) {
  if (env.default !== undefined && env.default !== null) {
    return env.default;
  }
  const label = ColorMe.standard("basic").content(`${env.description}\n`).color(
    "white",
  ).content(key).color("brightCyan");
  if (env.default !== undefined) {
    label.content(` (${env.default})`).color("yellow");
  }
  label.content(":").color("white");
  const value = prompt(label.end());
  if (value === null) {
    return env.default;
  }
  return value;
}
