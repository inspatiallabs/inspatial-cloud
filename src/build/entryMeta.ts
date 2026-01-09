import type { InField } from "@inspatial/cloud/types";
import { defineChildEntry } from "../orm/child-entry/child-entry.ts";
import type { EntryConfig } from "../orm/entry/types.ts";
import { EntryTypeMigrator } from "../orm/migrate/entry-type/entry-type-migrator.ts";
import { convertString } from "../utils/convert-string.ts";
import { defineEntry } from "../orm/entry/entry-type.ts";

const entryHooks = defineChildEntry("hooks", {
  label: "Lifecycle Hooks",
  idMode: {
    type: "fields",
    fields: ["parent", "hook", "name"],
  },
  fields: [{
    key: "hook",
    label: "Hook",
    type: "ChoicesField",
    required: true,
    choices: [{
      key: "beforeCreate",
      label: "Before Create",
      description: "Called before a new entry is created.",
    }, {
      key: "afterCreate",
      label: "After Create",
      description: "Called after a new entry is created.",
    }, {
      key: "beforeUpdate",
      label: "Before Update",
      description: "Called before an existing entry is updated.",
    }, {
      key: "afterUpdate",
      label: "After Update",
      description: "Called after an existing entry is updated.",
    }, {
      key: "beforeDelete",
      label: "Before Delete",
      description: "Called before an entry is deleted.",
    }, {
      key: "afterDelete",
      label: "After Delete",
      description: "Called after an entry is deleted.",
    }, {
      key: "beforeValidate",
      label: "Before Validate",
      description: "Called before an entry is validated.",
    }, {
      key: "validate",
      label: "Validate",
      description: "Called to validate an entry.",
    }],
  }, {
    key: "name",
    type: "DataField",
    required: true,
    description: "The unique name of this hook",
  }, {
    key: "description",
    type: "TextField",
    description: "A brief description of what this hook does.",
  }, {
    key: "handler",
    type: "CodeField",
    required: true,
    description: "The code to execute for this hook",
  }, {
    key: "active",
    type: "BooleanField",
    description: "Whether this hook is active or not.",
  }],
});

export const entryMeta = defineEntry("entryMeta", {
  systemGlobal: true,
  idMode: {
    type: "field",
    field: "name",
  },
  titleField: "label",
  searchFields: ["extension"],
  skipAuditLog: true,
  defaultListFields: ["label", "extension", "systemGlobal"],
  fields: [
    {
      key: "name",
      type: "DataField",
      required: true,
      readOnly: false,
      description: "The unique name of this entry type",
      unique: true,
    },
    { key: "label", type: "DataField", required: true },
    { key: "description", type: "TextField" },
    {
      key: "extension",
      type: "ConnectionField",
      entryType: "extensionMeta",
      description: "The extension this entry type belongs to",
    },
    {
      key: "custom",
      type: "BooleanField",
      description: "Whether this entry type is custom or not",
    },
    { key: "titleField", type: "DataField" },
    { key: "systemGlobal", type: "BooleanField" },
  ],
  children: [entryHooks],
});

entryMeta.addHook("beforeCreate", {
  name: "generateName",
  handler({ entryMeta }) {
    if (entryMeta.$name) {
      return;
    }
    entryMeta.$name = convertString(entryMeta.$label, "camel");
  },
});
entryMeta.addHook("afterCreate", {
  name: "migrateCustomAfterUpdate",
  async handler({
    entryMeta,
  }) {
    if (entryMeta.$custom) {
      await entryMeta.runAction("migrate");
    }
  },
});
entryMeta.addHook("afterUpdate", {
  name: "migrateCustomAfterUpdate",
  async handler({
    entryMeta,
  }) {
    if (entryMeta._user?.userId === "systemAdmin") {
      return;
    }
    if (entryMeta.$custom) {
      await entryMeta.runAction("migrate");
    }
  },
});
entryMeta.addAction("generateCode", {
  label: "Generate Code",
  description: "Generates the code for this entry type",
  action(
    {
      entryMeta,
    },
  ) {
  },
});
entryMeta.addAction("generateConfig", {
  async action({ entryMeta, orm }) {
    const { $label, $name, $systemGlobal, $hooks, $description, $titleField } =
      entryMeta;
    const { rows: fieldIds } = await orm.getEntryList("fieldMeta", {
      columns: ["id"],
      filter: {
        entryMeta: entryMeta.id,
      },
    });
    const fields: Array<InField> = [];
    for (const { id } of fieldIds) {
      const fieldMeta = await orm.getEntry("fieldMeta", id);
      const fieldConfig = await fieldMeta.runAction(
        "generateConfig",
      ) as InField;
      fields.push(fieldConfig);
    }

    const config: EntryConfig<any> = {
      label: $label,
      description: $description,
      systemGlobal: $systemGlobal || false,
      fields,
      children: [],
      actions: [],
    };
    if ($titleField) {
      const fieldName = $titleField.match(/:(\w+)$/);
      if (fieldName) {
        config.titleField = fieldName[1];
      }
    }
    return config;
  },
});
entryMeta.addAction("bootSync", {
  description: "Synce on boot if custom",
  private: true,
  async action({ entryMeta, inCloud, orm }) {
    if (!entryMeta.$custom) {
      return;
    }
    const config = await entryMeta.runAction("generateConfig") as EntryConfig<
      any
    >;

    const { $name, $extension, $extension__title, $hooks } = entryMeta;
    if (!entryMeta.id || !entryMeta.$name) {
      return;
    }
    const entryType = defineEntry($name, config);
    for (const hook of $hooks.data) {
      const func = new Function(
        $name,
        "orm",
        "inCloud",
        "entry",
        hook.handler,
      );
      entryType.addHook(hook.hook, {
        name: hook.name,
        description: hook.description || undefined,
        handler: async (args) => {
          await func(args[$name], args.orm, args.inCloud, args.entry);
        },
      });
    }
    entryType.extension = $extension || "";
    entryType.config.extension = {
      key: $extension || "",
      label: $extension__title || "",
      extensionType: {
        key: "cloud",
        label: "Cloud Extension",
      },
    };
    inCloud.roles.updateEntryType(entryType);
    return entryType;
  },
});
entryMeta.addAction("migrate", {
  description: "Syncs the database schema",
  async action({ entryMeta, inCloud, orm }) {
    if (!entryMeta.$custom) {
      console.log("Not a custom entry type, skipping migrate");
      return;
    }
    const entryType = await entryMeta.runAction("bootSync") as ReturnType<
      typeof defineEntry
    >;
    if (!entryType) {
      console.log("No entry type returned from bootSync");
      return;
    }
    const migrator = new EntryTypeMigrator({
      entryType,
      db: entryMeta.$systemGlobal ? inCloud.orm.systemDb : orm.db,
      orm,
      onOutput: (message) => {
        inCloud.inLog.info(message, {
          subject: `Migrate ${entryMeta.$label}`,
        });
      },
    });
    await migrator.migrate();
    inCloud.inLive.announce({
      system: "refresh",
    });

    // return await migrator.planMigration();
  },
});
