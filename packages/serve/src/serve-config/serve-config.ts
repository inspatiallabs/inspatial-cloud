import type { InSpatialServer } from "#/inspatial-server.ts";
import { joinPath } from "#/utils/path-utils.ts";
import type { ConfigDefinition } from "#/types.ts";
import { serveEnvConfig } from "#/serve-config/serve-env.ts";

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
        // console.log(`Setting ${subKey} to ${value}`);
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
export async function generateServeConfigFile(
  server: InSpatialServer,
): Promise<void> {
  const filePath = joinPath(Deno.cwd(), "serve-config.json");
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
  const mappedServeConfig = mapConfig(serveEnvConfig);
  masterConfig.set("serve", Object.fromEntries(mappedServeConfig));
  server.installedExtensions.forEach((extension) => {
    const configDef = extension.config;

    const mappedConfig = mapConfig(configDef);
    masterConfig.set(extension.name, Object.fromEntries(mappedConfig));
  });
  const config = {
    $schema: ".inspatial/serve-config-schema.json",
    ...Object.fromEntries(masterConfig),
  };

  const file = JSON.stringify(config, null, 2);
  await Deno.writeTextFile(filePath, file);
}

export async function generateConfigSchema(
  server: InSpatialServer,
): Promise<void> {
  const filePath = joinPath(
    Deno.cwd(),
    ".inspatial",
    "serve-config-schema.json",
  );
  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: {} as Record<string, any>,
    required: [],
  };

  for (const extension of server.installedExtensions) {
    const configSchema = generateConfigSchemaForExtension(extension.config);
    if (configSchema) {
      schema.properties[extension.name] = {
        ...configSchema,
        description: extension.description,
      };
    }
  }
  const serveConfigSchema = generateConfigSchemaForExtension(serveEnvConfig);
  if (serveConfigSchema) {
    schema.properties.serve = {
      ...serveConfigSchema,
      description: "InSpatial server configuration",
    };
  }
  const file = JSON.stringify(schema, null, 2);
  await Deno.mkdir(joinPath(Deno.cwd(), ".inspatial"), {
    recursive: true,
  });
  await Deno.writeTextFile(filePath, file);
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
/*

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "serve": {
      "type": "object",
      "properties": {
        "LOG_LEVEL": {
          "type": "string",
          "enum": [
            "info",
            "debug",
            "warn",
            "error"
          ]
        },
        "LOG_TRACE": {
          "type": "boolean"
        }
      },
      "required": [
        "LOG_LEVEL",
        "LOG_TRACE"
      ]
    },
    "actions-api": {
      "type": "object"
    },
    "CORS": {
      "type": "object",
      "properties": {
        "ALLOWED_ORIGINS": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ALLOWED_ORIGINS"
      ]
    },
    "realtime": {
      "type": "object"
    },
    "db": {
      "type": "object",
      "properties": {
        "DB_CONNECTION_TYPE": {
          "type": "string",
          "enum": [
            "tcp",
            "socket"
          ]
        },
        "DB_SOCKET_PATH": {
          "type": "string"
        },
        "DB_NAME": {
          "type": "string"
        },
        "DB_HOST": {
          "type": "string"
        },
        "DB_PORT": {
          "type": "integer",
          "minimum": 1,
          "maximum": 65535
        },
        "DB_USER": {
          "type": "string"
        },
        "DB_PASSWORD": {
          "type": "string"
        },
        "DB_SCHEMA": {
          "type": "string"
        }
      },
      "required": [
        "DB_CONNECTION_TYPE",
        "DB_NAME",
        "DB_USER"
      ]
    },
    "auth": {
      "type": "object"
    },
    "orm": {
      "type": "object"
    }
  },
  "required": [
    "serve",
    "CORS",
    "db"
  ]
}
*/
