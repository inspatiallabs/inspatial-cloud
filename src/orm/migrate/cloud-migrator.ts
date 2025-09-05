import { InCloud } from "~/in-cloud.ts";
import type { InSpatialORM } from "../mod.ts";
import type { EntryMeta } from "../../core/_entry-meta.type.ts";
import { ExtensionMeta } from "../../core/_extension-meta.type.ts";
import { FieldMeta } from "../../core/_field-meta.type.ts";

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
      let model = await orm.findEntry<ExtensionMeta>("extensionMeta", {
        id: extension.key,
      });
      if (!model) {
        model = orm.getNewEntry<ExtensionMeta>("extensionMeta");
        model.$key = extension.key;
      }
      model.$label = extension.label;
      model.$description = extension.description;
      model.$version = extension.version;
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
      const name = entryType.name;
      entryNames.add(name);
      let model = await orm.findEntry<EntryMeta>("entryMeta", {
        id: name,
      });
      if (!model) {
        model = orm.getNewEntry<EntryMeta>("entryMeta");
        model.$name = name;
      }
      model.$systemGlobal = entryType.systemGlobal || false;
      model.update({
        label: entryType.label,
        description: entryType.description,
        titleField: entryType.config.titleField,
        extension: entryType.config.extension?.key || undefined,
      });

      await model.save();
    }
    await orm.db.deleteRows("entryFieldMeta", [{
      field: "entryMeta",
      op: "notInList",
      value: Array.from(entryNames),
    }]);
    await orm.db.deleteRows("entryEntryMeta", [{
      field: "id",
      op: "notInList",
      value: Array.from(entryNames),
    }]);

    await this.#syncFieldMeta(orm);
  }
  async #syncFieldMeta(orm: InSpatialORM) {
    const adminRole = orm.roles.getRole("systemAdmin");
    const skipFields = new Set<string>([
      "id",
      "createdAt",
      "updatedAt",
      "in__tags",
    ]);
    for (const entryType of adminRole.entryTypes.values()) {
      for (const [key, field] of entryType.fields.entries()) {
        if (skipFields.has(key)) continue;
        if (key.endsWith("__title")) continue; // skip title fields
        let fieldMeta = await orm.findEntry<FieldMeta>("fieldMeta", {
          id: `${entryType.name}:${key}`,
        });
        if (!fieldMeta) {
          fieldMeta = orm.getNewEntry<FieldMeta>("fieldMeta");
          fieldMeta.$key = key;
          fieldMeta.$entryMeta = entryType.name;
        }
        fieldMeta.$label = field.label || key;
        fieldMeta.$description = field.description || "";
        fieldMeta.$type = field.type;
        fieldMeta.$required = field.required || false;
        fieldMeta.$readOnly = field.readOnly || false;
        fieldMeta.$unique = field.unique || false;
        fieldMeta.$defaultValue = field.defaultValue;
        fieldMeta.$hidden = field.hidden || false;
        fieldMeta.$placeholder = field.placeholder || "";
        if (field.type === "ConnectionField" && field.entryType) {
          fieldMeta.$entryType = field.entryType;
        }
        await fieldMeta.save();
      }
    }
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
