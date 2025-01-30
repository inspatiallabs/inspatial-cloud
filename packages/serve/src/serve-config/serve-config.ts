import type { InSpatialServer } from "#/inspatial-server.ts";
import { joinPath } from "@vef/easy-utils";

/**
 * Checks for a serve-config.json file in the current working directory and loads it to the environment variables.
 */
export function loadServeConfigFile(): Record<string, any> | undefined {
  try {
    const filePath = joinPath(Deno.cwd(), "serve-config.json");
    const file = Deno.readTextFileSync(filePath);
    const config = JSON.parse(file);
    for (const key in config) {
      const extensionConfig = config[key];
      for (const subKey in extensionConfig) {
        const value = extensionConfig[subKey];

        Deno.env.set(subKey, value);
      }
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      console.log("No easyConfig.json found");
      return undefined;
    }
    throw e;
  }
}

/**
 * Generates a serve-config_generated.json file in the current working directory based on the installed extensions.
 */
export async function generateServeConfigFile(server: InSpatialServer) {
  const filePath = joinPath(Deno.cwd(), "serve-config_generated.json");
  const masterConfig = new Map<string, any>();
  server.installedExtensions.forEach((extension) => {
    const configDef = extension.config;

    const mappedConfig = new Map<string, any>();
    for (const key in configDef) {
      const config = configDef[key];
      let value: any = "";
      switch (config.type) {
        case "string":
        case "number":
          value = config.default || "";
          break;
        case "boolean":
          value = config.default || false;
          break;
        case "string[]":
          value = config.default || [];
          break;
      }

      mappedConfig.set(config.env!, value);
    }
    masterConfig.set(extension.name, Object.fromEntries(mappedConfig));
  });
  const config = Object.fromEntries(masterConfig);
  const file = JSON.stringify(config, null, 2);
  await Deno.writeTextFile(filePath, file);
}
