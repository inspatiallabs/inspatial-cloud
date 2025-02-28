import { IDMode, ORMFieldDef } from "#/field/types.ts";
import { raiseORMException } from "#/orm-exception.ts";
import { convertString } from "@inspatial/serve/utils";
import {
  EntryActionDefinition,
  EntryHookDefinition,
  EntryInfo,
  EntryTypeConfig,
} from "#/entry/types.ts";
import { EntryBase } from "#/entry/entry-base.ts";
import { EntryHookName } from "#/types.ts";

export class EntryType<
  E extends EntryBase = EntryBase & { [key: string]: any },
  N extends string = string,
> {
  name: N;
  config: EntryTypeConfig;
  defaultListFields: Set<string> = new Set(["id", "createdAt", "updatedAt"]);
  fields: Map<string, ORMFieldDef> = new Map();
  actions: Map<string, EntryActionDefinition> = new Map();
  constructor(name: N, config: {
    description?: string;
    label?: string;
    idMode?: IDMode;
    defaultListFields?: Array<keyof E>;
    fields: Array<ORMFieldDef>;
    actions: Array<EntryActionDefinition<E>>;
    hooks?: Partial<Record<EntryHookName, Array<EntryHookDefinition<E>>>>;
  }) {
    this.fields.set("id", {
      key: "id",
      type: "IDField",
      idMode: config.idMode || "auto",
      label: "ID",
      readOnly: true,
      required: true,
    });
    this.fields.set("createdAt", {
      key: "createdAt",
      label: "Created At",
      type: "TimeStampField",
      readOnly: true,
      description: "The date and time this entry was created",
      required: true,
    });
    this.fields.set("updatedAt", {
      key: "updatedAt",
      label: "Updated At",
      type: "TimeStampField",
      readOnly: true,
      description: "The date and time this entry was last updated",
      required: true,
    });
    this.name = this.#sanitizeName(name);
    const label: string = config.label || convertString(name, "title", true);
    this.config = {
      tableName: this.#generateTableName(),
      label,
      idMode: config.idMode || "ulid",
      description: config.description ||
        `${label} entry type for InSpatial ORM`,
    };

    for (const field of config.fields) {
      if (this.fields.has(field.key)) {
        raiseORMException(
          `Field with key ${field.key} already exists in EntryType ${this.name}`,
        );
      }
      this.fields.set(field.key, field);
    }
    if (config.defaultListFields) {
      const defaultListFields = new Set(config.defaultListFields) as Set<
        string
      >;
      for (const fieldKey of defaultListFields) {
        if (!this.fields.has(fieldKey)) {
          raiseORMException(
            `Field with key ${fieldKey.toString()} does not exist in EntryType ${this.name}`,
          );
        }
        this.defaultListFields.add(fieldKey);
      }
    }

    for (const actionKey in config.actions) {
      if (this.actions.has(actionKey)) {
        raiseORMException(
          `Action with key ${actionKey} already exists in EntryType ${this.name}`,
        );
      }
      const action = config.actions[actionKey];
      this.actions.set(actionKey, action);
    }
  }

  get info(): EntryInfo {
    return {
      name: this.name,
      config: this.config,
      fields: Array.from(this.fields.values()),
      actions: Array.from(this.actions.values()),
    };
  }
  #generateTableName(): string {
    convertString;
    const snakeName = convertString(this.name, "snake", true);
    return `entry_${snakeName}`;
  }
  #sanitizeName<N>(name: string): N {
    return name as N;
  }
}
