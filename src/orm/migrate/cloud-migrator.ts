import { InCloud } from "~/in-cloud.ts";
import type { InSpatialORM } from "../mod.ts";
import type { EntryMeta } from "../../core/_entry-meta.type.ts";

export class InCloudMigrator extends InCloud {
  constructor(appName: string, config: any) {
    super(appName, config, "migrator");
  }
  async migrate(): Promise<void> {
    await this.#migrateGlobal();
    await this.#migrateAccounts();
  }

  async #migrateGlobal() {
    const orm = this.orm.withUser(this.orm.systemGobalUser);

    await orm.migrateGlobal();
    await this.#syncExtensionModels(orm);
    await this.#syncDatabaseEntryModels(orm);
    for (const migrateAction of this.extensionManager.afterMigrate.global) {
      await migrateAction.action({
        inCloud: this,
        orm,
      });
    }
  }
  async #syncExtensionModels(orm: InSpatialORM) {
    for (const extension of this.extensionManager.extensions.values()) {
      console.log(`Syncing extension: ${extension.key}!`);
      let model = await orm.findEntry("extensionMeta", {
        id: extension.key,
      });
      if (!model) {
        model = orm.getNewEntry("extensionMeta");
        model.key = extension.key;
      }

      await model.save();
    }
    const extensionKeys = Array.from(
      this.extensionManager.extensions.keys(),
    );
    await orm.db.deleteRows("entryExtensionMeta", [{
      field: "id",
      op: "notInList",
      value: extensionKeys,
    }]);
  }
  async #syncDatabaseEntryModels(orm: InSpatialORM) {
    const adminRole = orm.roles.getRole("systemAdmin"); // ensure admin role exists
    const entryNames = new Set<string>();
    for (const entryType of adminRole.entryTypes.values()) {
      if (entryType.name === "entryMeta") {
        continue;
      }
      const name = entryType.name;
      entryNames.add(name);
      console.log(`Syncing entry type: ${name}!`);
      let model = await orm.findEntry<EntryMeta>("entryMeta", {
        id: name,
      });
      if (!model) {
        model = orm.getNewEntry<EntryMeta>("entryMeta");
        model.name = name;
      }
      model.systemGlobal = entryType.systemGlobal || false;
      console.log(entryType.config.extension?.key);
      model.update({
        label: entryType.label,
        description: entryType.description,
        titleField: entryType.config.titleField,
        extension: entryType.config.extension?.key || undefined,
      });
      await model.save();
    }

    await orm.db.deleteRows("entryEntryMeta", [{
      field: "id",
      op: "notInList",
      value: Array.from(entryNames),
    }]);
  }
  async #migrateAccounts() {
    const { rows: accounts } = await this.orm.getEntryList(
      "account",
      {
        columns: ["id"],
        filter: {
          initialized: true,
        },
        limit: 0,
      },
    );
    for (const { id } of accounts) {
      await this.orm.migrate(id);
    }
  }
}
