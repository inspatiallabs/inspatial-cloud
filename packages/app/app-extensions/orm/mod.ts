import { AppExtension } from "#/app-extension.ts";
import ormGroup from "./actions/orm-group.ts";
import entriesGroup from "./actions/entries-group.ts";
import { ormServeExtension } from "./serveExtension.ts";

export const ormExtension = new AppExtension({
  key: "orm",
  description: "ORM Extension",
  install(app) {},
  title: "ORM Extension",
  version: "0.0.1",
  actionGroups: [ormGroup, entriesGroup],
  serverExtensions: [
    ormServeExtension,
  ],
});
