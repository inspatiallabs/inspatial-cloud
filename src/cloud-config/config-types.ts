import type { ORMConfig } from "#extensions/orm/config.ts";
import type { AuthConfig } from "#extensions/auth/config.ts";
import type { CloudConfig } from "../base-extension/config.ts";

/**
 * The configuration for an environment variable.
 */
export type ConfigEnv<
  T extends keyof ConfigEnvTypeMap = keyof ConfigEnvTypeMap,
> = {
  env?: string;
  description: string;
  required?: boolean;
  dependsOn?:
    | {
      key: string;
      value: ConfigEnvTypeMap[T];
    }
    | Array<{
      key: string;
      value: ConfigEnvTypeMap[T];
    }>;
  default?: ConfigEnvTypeMap[T];
  enum?: ConfigEnvTypeMap[T][];
  type: T;
};

/**
 * The type map for the ConfigEnv type definition.
 */
export interface ConfigEnvTypeMap {
  /**
   * A 'string' type.
   */
  string: string;

  /**
   * A 'number' type.
   */
  number: number;

  /**
   * A 'boolean' type.
   */
  boolean: boolean;

  /**
   * An array of 'string' type.
   */
  "string[]": Array<string>;
}

/**
 * Extract the value type from a ConfigEnv definition.
 */
export type ExtractConfigEnvValue<C extends ConfigEnv> = C extends
  ConfigEnv<infer T> ? ConfigEnvTypeMap[T]
  : never;

/**
 * The configuration values for the extension.
 */
export type ExtensionConfig<C extends ConfigDefinition> = C extends
  ConfigDefinition<infer K> ? {
    [P in K]: ExtractConfigEnvValue<C[P]>;
  }
  : never;

export type ExtractConfig<K extends ConfigKey> = ConfigMap[K];

export type ConfigKey = keyof ConfigMap;

export interface ConfigMap {
  cloud: CloudConfig;
  orm: ORMConfig;
  auth: AuthConfig;
}

/**
 * The definition configuration of the environment variables for the extension.
 */
export type ConfigDefinition<K extends string = string> = Record<K, ConfigEnv>;
