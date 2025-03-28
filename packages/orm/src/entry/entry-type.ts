import type { IDMode } from "#/field/types.ts";
import { raiseORMException } from "#/orm-exception.ts";
import { convertString } from "@inspatial/serve/utils";
import type {
  EntryActionDefinition,
  EntryHookDefinition,
  EntryTypeConfig,
  EntryTypeInfo,
} from "#/entry/types.ts";
import type { EntryBase, GenericEntry } from "#/entry/entry-base.ts";
import type { EntryHookName } from "#/types.ts";
import type { ORMFieldDef } from "#/field/field-def-types.ts";
import { BaseType } from "#/shared/base-type-class.ts";

export class EntryType<
  E extends GenericEntry = GenericEntry,
  N extends string = string,
> extends BaseType<N> {
  config: EntryTypeConfig;
  defaultListFields: Set<string> = new Set(["id", "createdAt", "updatedAt"]);

  actions: Map<string, EntryActionDefinition> = new Map();
  hooks: Record<EntryHookName, Array<EntryHookDefinition<E>>> = {
    beforeUpdate: [],
    afterCreate: [],
    afterDelete: [],
    afterUpdate: [],
    beforeCreate: [],
    beforeDelete: [],
    beforeValidate: [],
    validate: [],
  };
  constructor(name: N, config: {
    description?: string;
    /**
     * The field to use as the display value instead of the ID.
     */
    titleField?: keyof E;
    label?: string;
    idMode?: IDMode;
    defaultListFields?: Array<keyof E>;
    fields: Array<ORMFieldDef>;
    actions: Array<EntryActionDefinition<E>>;
    hooks?: Partial<Record<EntryHookName, Array<EntryHookDefinition<E>>>>;
  }) {
    super(name, config);
    this.fields.set("id", {
      key: "id",
      type: "IDField",
      idMode: config.idMode || "auto",
      label: config.label || "ID",
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
    const label: string = config.label || convertString(name, "title", true);
    this.config = {
      tableName: this.#generateTableName(),
      label,
      titleField: config.titleField as string || "id",
      idMode: config.idMode || "ulid",
      description: config.description ||
        `${label} entry type for InSpatial ORM`,
    };

    if (config.defaultListFields) {
      const defaultListFields = new Set<string>(
        config.defaultListFields as string[],
      );
      for (const fieldKey of defaultListFields) {
        if (!this.fields.has(fieldKey)) {
          raiseORMException(
            `Field with key ${fieldKey.toString()} does not exist in EntryType ${this.name}`,
          );
        }
        this.defaultListFields.add(fieldKey);
      }
    }
    if (this.config.titleField) {
      this.defaultListFields.add(this.config.titleField);
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

    this.hooks = {
      ...this.hooks,
      ...config.hooks,
    };
  }

  get info(): EntryTypeInfo {
    return {
      name: this.name,
      label: this.config.label,
      config: this.config,
      fields: Array.from(this.fields.values()),
      titleFields: Array.from(this.connectionTitleFields.values()),
      actions: Array.from(this.actions.values()),
      displayFields: Array.from(this.displayFields.values()),
      defaultListFields: Array.from(this.defaultListFields).map((f) =>
        this.fields.get(f)!
      ),
    };
  }
  #generateTableName(): string {
    const snakeName = convertString(this.name, "snake", true);
    return `entry_${snakeName}`;
  }
}
