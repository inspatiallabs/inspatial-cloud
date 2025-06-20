import type { ConfigEnv } from "#types/serve-types.ts";
import type { CloudExtensionInfo } from "/app/types.ts";
import ColorMe from "/utils/color-me.ts";
import { joinPath } from "/utils/path-utils.ts";
import type { InCloud } from "./cloud/cloud-common.ts";

export function initCloud(inCloud: InCloud): void {
  const filePath = joinPath(inCloud.cloudRoot, "cloud-config.json");
  const masterConfig = new Map<string, Record<string, any>>();
  inCloud.installedExtensions.forEach((extension) => {
    const configResult = promptForConfig(extension);
    if (Object.keys(configResult).length == 0) {
      return;
    }
    masterConfig.set(extension.key, configResult);
  });

  const config = {
    $schema: ".inspatial/cloud-config-schema.json",
    ...Object.fromEntries(masterConfig),
  };

  const file = JSON.stringify(config, null, 2);
  Deno.writeTextFileSync(filePath, file);
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
    if (output !== undefined) {
      configResults.set(env.env!, output);
    }
  }
  for (const [key, env] of dependencies) {
    const dependsOn: Array<{ key: string; value: any }> = [];
    if (Array.isArray(env.dependsOn)) {
      dependsOn.push(...env.dependsOn);
    } else {
      dependsOn.push(env.dependsOn as any);
    }
    let isDependencySatisfied = true;
    for (const item of dependsOn) {
      const dependencyKey = extension.config[item.key]?.env;
      if (!dependencyKey) {
        throw new Error(
          `Dependency key ${item.key} not found in config`,
        );
      }
      const dependencyValue = configResults.get(dependencyKey);
      if (dependencyValue !== item.value) {
        isDependencySatisfied = false;
      }
    }
    if (isDependencySatisfied) {
      const output = promptConfigValue(key, env);
      if (output !== undefined) {
        configResults.set(env.env!, output);
      }
    }
  }

  const results = Object.fromEntries(configResults);
  return results;
  // console.log(extension.config);
}

function promptConfigValue(key: string, env: ConfigEnv) {
  if (env.type === "boolean") {
    if (env.default === null || env.default === undefined) {
      return undefined;
    }
  }
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
