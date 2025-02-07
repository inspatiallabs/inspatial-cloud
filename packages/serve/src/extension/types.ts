import type { ConfigDefinition, ServeConfig } from "#/types.ts";

interface DetailInfo {
  name: string;
  description: string;
}
export type ServerExtensionInfo = {
  name: string;
  description: string;
  config: ConfigDefinition;
  requestExtensions: DetailInfo[];
  middleware: DetailInfo[];
  pathHandlers: DetailInfo[];
};

export type ExtensionMap<C extends ServeConfig> = {
  [P in C["extensions"][number] as P["name"]]: ReturnType<P["install"]>;
};
