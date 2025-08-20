import { joinPath } from "~/utils/path-utils.ts";
import convertString from "~/utils/convert-string.ts";
import type { BuiltInConfig } from "./config-types.ts";

const keyRegex = /^IN_([A-Z_]+)/;

/**
 * Checks for a cloud-config.json file in the current working directory and loads it to the environment variables.
 */
export function loadCloudConfigFile(
  cloudRoot: string,
): {
  config: BuiltInConfig;
  env: Record<string, any>;
  customConfig: Record<string, any>;
} | false {
  const builtInConfig: Record<string, Record<string, any>> = {};
  const customConfig: Record<string, any> = {};
  const env: Record<string, any> = {};
  try {
    const filePath = joinPath(cloudRoot, "cloud-config.json");
    const file = Deno.readTextFileSync(filePath);
    const config = JSON.parse(file);
    for (const key in config) {
      if (key.startsWith("$")) {
        continue;
      }
      const match = keyRegex.exec(key);
      if (match) {
        let kind: string = typeof config[key];
        if (kind === "object" && Array.isArray(config[key])) {
          kind = "array";
        }
        // if (kind === "object" && config[key] === null) {
        //   continue;
        // }

        env[key] = `*${kind}*${config[key].toString()}`;
        customConfig[convertString(match[1], "camel")] = config[key];
        continue;
      }
      const extensionConfig = config[key];
      for (const subKey in extensionConfig) {
        if (!Object.keys(builtInConfig).includes(key)) {
          builtInConfig[key] = {};
        }
        builtInConfig[key][convertString(subKey, "camel")] =
          extensionConfig[subKey];
        env[subKey] = extensionConfig[subKey].toString();
      }
    }
    // TODO: Validate the config against the schema
    return {
      config: builtInConfig as unknown as BuiltInConfig,
      env,
      customConfig,
    };
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return false;
    }
    throw e;
  }
}
