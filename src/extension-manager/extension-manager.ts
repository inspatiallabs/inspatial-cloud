import { type PathHandler, RequestPathHandler } from "~/app/path-handler.ts";
import type { ExceptionHandler } from "#types/serve-types.ts";
import type { LifecycleHandlerRunner } from "~/app/request-lifecycle.ts";
import type { CloudExtension } from "~/app/cloud-extension.ts";
import { raiseServerException } from "~/app/server-exception.ts";
import type { InRequest } from "~/app/in-request.ts";
import type { EntryType } from "~/orm/entry/entry-type.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";
import type { Middleware } from "~/app/middleware.ts";
import type { EntryHooks } from "~/orm/orm-types.ts";
import type {
  ConfigKey,
  ConfigMap,
  ExtensionConfig,
} from "../cloud-config/config-types.ts";
import type { RoleConfig } from "~/orm/roles/role.ts";
import { raiseCloudException } from "../app/exeption/cloud-exception.ts";

export class ExtensionManager {
  middlewares: Map<string, Middleware> = new Map();
  pathHandlers: Array<PathHandler> = [];
  exceptionHandlers: Map<string, ExceptionHandler> = new Map();
  extensions: Map<string, CloudExtension> = new Map();
  extensionsConfig: Map<string, Map<string, any>> = new Map();
  roles: Map<string, RoleConfig> = new Map();
  entryTypes: Array<EntryType> = [];
  settingsTypes: Array<SettingsType> = [];
  ormGlobalHooks: EntryHooks = {
    afterCreate: [],
    beforeUpdate: [],
    beforeDelete: [],
    afterUpdate: [],
    afterDelete: [],
    beforeCreate: [],
    beforeValidate: [],
    validate: [],
  };
  requestLifecycle: LifecycleHandlerRunner = {
    setup: [],
    cleanup: [],
  };

  registerExtension(extension: CloudExtension): void {
    if (this.extensions.has(extension.key)) {
      raiseServerException(
        500,
        `Extension ${extension.key} is already installed`,
      );
    }
    this.extensions.set(extension.key, extension);
    this.setupExtensionConfig(extension);

    // Lifecycle handlers
    if (extension.requestLifecycle) {
      for (const setup of extension.requestLifecycle.setup) {
        const config = this.getExtensionConfig(extension.key);

        this.requestLifecycle.setup.push({
          ...setup,
          handler: (inRequest: InRequest) => {
            return setup.handler(inRequest, config as ExtensionConfig<any>);
          },
        });
      }
      for (const cleanup of extension.requestLifecycle.cleanup) {
        this.requestLifecycle.cleanup.push({
          ...cleanup,
          handler: (inRequest: InRequest) => {
            const config = this.getExtensionConfig(extension.key);
            return cleanup.handler(
              inRequest,
              config as ExtensionConfig<any>,
            );
          },
        });
      }
    }

    // Middleware
    for (const middleware of extension.middleware) {
      if (this.middlewares.has(middleware.name)) {
        raiseServerException(
          500,
          `Middleware ${middleware.name} is already installed`,
        );
      }
      this.middlewares.set(middleware.name, middleware);
    }

    // Path handlers
    for (const pathHandler of extension.pathHandlers) {
      const handlerInstance = new RequestPathHandler(
        pathHandler.name,
        pathHandler.description,
        pathHandler.match,
        pathHandler.handler,
      );
      this.pathHandlers.push(handlerInstance);
    }

    // Exception handlers
    for (const exceptionHandler of extension.exceptionHandlers) {
      if (this.exceptionHandlers.has(exceptionHandler.name)) {
        throw new Error(
          `Exception handler with name ${exceptionHandler.name} already exists`,
        );
      }
      this.exceptionHandlers.set(exceptionHandler.name, exceptionHandler);
    }
    /* ORM */
    const { entryTypes, settingsTypes, ormGlobalHooks } = extension;
    if (entryTypes) {
      this.entryTypes.push(...entryTypes);
    }
    if (settingsTypes) {
      this.settingsTypes.push(...settingsTypes);
    }
    if (ormGlobalHooks) {
      for (const hookName of Object.keys(ormGlobalHooks)) {
        this.ormGlobalHooks[hookName as keyof EntryHooks].push(
          ...(ormGlobalHooks[hookName as keyof EntryHooks] || []),
        );
      }
    }
    for (const roleConfig of extension.roles.values()) {
      if (this.roles.has(roleConfig.roleName)) {
        raiseCloudException(
          `${roleConfig.roleName} is already a registered role!`,
          {
            type: "fatal",
            scope: "Install Extension",
          },
        );
      }
      this.roles.set(roleConfig.roleName, roleConfig);
    }
  }
  /**
   * Gets the configuration for a given extension.
   *
   * @param extension {string} The name of the extension
   */
  getExtensionConfig<K extends ConfigKey>(extension: K): ConfigMap[K];
  getExtensionConfig<K extends string>(
    extension: K,
  ): Record<string, unknown>;
  getExtensionConfig(extension: string): Record<string, unknown> {
    const config = this.extensionsConfig.get(extension);
    if (config === undefined) {
      throw new Error(`Extension ${extension} not found`);
    }
    return Object.fromEntries(config);
  }

  /**
   * Sets the configuration value for a given key in an extension.
   *
   * @param extension {string} The name of the extension
   * @param key {string} The key of the configuration value
   * @param value {unknown} The value to set
   */
  setExtensionConfigValue(
    extension: string,
    key: string,
    value: unknown,
  ): void {
    const config = this.extensionsConfig.get(extension);
    if (!config) {
      throw new Error(`Extension ${extension} not found`);
    }
    if (Array.isArray(value)) {
      value = new Set(value);
    }
    config.set(key, value);
  }

  /**
   * Gets the configuration value for a given key in an extension.
   *
   * @param extension {string} The name of the extension
   * @param key {string} The key of the configuration value
   */
  getExtensionConfigValue<
    C extends ConfigKey,
    K extends keyof ConfigMap[C],
  >(
    extension: C,
    key: K,
  ): ConfigMap[C][K];
  getExtensionConfigValue<S extends string>(
    extension: string,
    key: string,
  ): unknown;
  getExtensionConfigValue(
    extension: string,
    key: string,
  ): unknown {
    const config = this.extensionsConfig.get(extension);
    if (!config) {
      throw new Error(`Extension ${extension} not found`);
    }
    const value = config.get(key as string);

    return value;
  }

  setupExtensionConfig(
    extension: CloudExtension,
  ): void {
    this.extensionsConfig.set(extension.key, new Map());
    const configDefinition = extension.config;
    if (!configDefinition) {
      return;
    }

    for (const key in configDefinition) {
      const def = configDefinition[key];
      const envKey = def.env!;
      const value = Deno.env.get(envKey) ||
        this.getExtensionConfigValue(extension.key, key) || def.default;
      if (def.required && value === undefined) {
        console.warn(`Missing required environment variable ${envKey}`);
      }
      if (value === undefined) {
        continue;
      }
      switch (def.type) {
        case "string[]":
          try {
            let arr: string[] = [];
            if (typeof value === "string") {
              arr = value.replaceAll(/[\[\]]/g, "").split(",").map((v) =>
                v.trim()
              );
            }
            if (Array.isArray(value)) {
              arr = value;
            }
            this.setExtensionConfigValue(extension.key, key, arr);
          } catch (e) {
            console.error(e);
          }
          break;
        case "number":
          this.setExtensionConfigValue(extension.key, key, Number(value));
          break;
        case "boolean": {
          const trueValues = ["true", "1", "yes"];
          const falseValues = ["false", "0", "no"];
          let boolValue = false;
          switch (typeof value) {
            case "string":
              if (trueValues.includes(value)) {
                boolValue = true;
              }
              if (falseValues.includes(value)) {
                boolValue = false;
              }
              break;
            case "number":
              boolValue = value === 1;
              break;
            case "boolean":
              boolValue = value;
              break;
          }

          this.setExtensionConfigValue(extension.key, key, boolValue);
          break;
        }
        default:
          this.setExtensionConfigValue(extension.key, key, value);
      }
    }
  }
}
