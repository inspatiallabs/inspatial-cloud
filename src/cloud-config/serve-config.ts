import { joinPath, normalizePath } from "#/utils/path-utils.ts";
import type { InCloud } from "#/inspatial-cloud.ts";
import type { ConfigDefinition } from "#types/serve-types.ts";
function getPath() {
  return normalizePath(Deno.mainModule, {
    toDirname: true,
  });
}
/**
 * Checks for a serve-config.json file in the current working directory and loads it to the environment variables.
 */
export function loadServeConfigFile(): Record<string, any> | undefined {
  try {
    const filePath = joinPath(getPath(), "serve-config.json");
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
      return undefined;
    }
    throw e;
  }
}

/**
 * Generates a serve-config_generated.json file in the current working directory based on the installed extensions.
 */
export function generateServeConfigFile(
  app: InCloud,
): void {
  const filePath = joinPath(getPath(), "serve-config.json");
  try {
    const existingFile = Deno.statSync(filePath);
    if (existingFile.isFile) {
      return;
    }
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      throw e;
    }
  }
  const masterConfig = new Map<string, any>();
  const mapConfig = (configDef: ConfigDefinition) => {
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
    return mappedConfig;
  };
  app.installedExtensions.forEach((extension) => {
    const configDef = extension.config;

    const mappedConfig = mapConfig(configDef);
    masterConfig.set(extension.key, Object.fromEntries(mappedConfig));
  });
  const config = {
    $schema: ".inspatial/serve-config-schema.json",
    ...Object.fromEntries(masterConfig),
  };

  const file = JSON.stringify(config, null, 2);
  Deno.writeTextFileSync(filePath, file);
}

export function generateConfigSchema(
  app: InCloud,
): void {
  const filePath = joinPath(
    getPath(),
    ".inspatial",
    "serve-config-schema.json",
  );
  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: {} as Record<string, any>,
    required: [],
  };

  for (const extension of app.installedExtensions) {
    const configSchema = generateConfigSchemaForExtension(extension.config);
    if (configSchema) {
      schema.properties[extension.key] = {
        ...configSchema,
        description: extension.description,
      };
    }
  }

  const file = JSON.stringify(schema, null, 2);
  Deno.mkdirSync(joinPath(getPath(), ".inspatial"), {
    recursive: true,
  });
  Deno.writeTextFileSync(filePath, file);
}

function generateConfigSchemaForExtension(
  configDef: ConfigDefinition,
) {
  if (!configDef) {
    return {
      type: "object",
    };
  }
  const properties = new Map<string, any>();
  const required = new Set<string>();
  for (const key in configDef) {
    const config = configDef[key];
    config.env = config.env || key;
    const property: Record<string, any> = {};
    switch (config.type) {
      case "string":
        property.type = "string";
        break;
      case "number":
        property.type = "integer";
        break;
      case "boolean":
        property.type = "boolean";
        break;
      case "string[]":
        property.type = "array";
        property.items = {
          type: "string",
        };
        break;
    }

    if (config.default) {
      property.default = config.default;
    }
    if (config.description) {
      property.description = config.description;
    }
    if (config.required) {
      required.add(config.env);
    }
    if (config.enum) {
      property.enum = config.enum;
    }
    properties.set(config.env, property);
  }
  const schema = {
    type: "object",
    properties: Object.fromEntries(properties),
    required: Array.from(required),
  };

  return schema;
}
