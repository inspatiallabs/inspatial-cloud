import type {
  EntryActionDefinition,
  EntryHookDefinition,
  EntryTypeConfig,
  EntryTypeInfo,
  ExtractFieldKeys,
} from "#/orm/entry/types.ts";
import type { EntryBase, GenericEntry } from "#/orm/entry/entry-base.ts";
import type { EntryHookName } from "#/orm/orm-types.ts";
import type { ORMFieldDef } from "#/orm/field/field-def-types.ts";
import { BaseType } from "#/orm/shared/base-type-class.ts";
import type { IDMode } from "#/orm/field/types.ts";
import { raiseORMException } from "#/orm/orm-exception.ts";
import convertString from "#/utils/convert-string.ts";

export class EntryType<
  E extends EntryBase = GenericEntry,
  N extends string = string,
  A extends Array<EntryActionDefinition<E>> = Array<
    EntryActionDefinition<E>
  >,
  FK extends PropertyKey = ExtractFieldKeys<E>,
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
    titleField?: FK;
    label?: string;
    idMode?: IDMode;
    defaultListFields?: Array<FK>;
    searchFields?: Array<FK>;
    fields: Array<ORMFieldDef>;
    actions?: A;
    hooks?: Partial<Record<EntryHookName, Array<EntryHookDefinition<E>>>>;
    roles?: Array<unknown>;
  }) {
    super(name, config);
    this.fields.set("id", {
      key: "id",
      type: "IDField",
      idMode: config.idMode || "ulid",
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
    const searchFields = new Set<PropertyKey>(config.searchFields);
    searchFields.add("id");
    if (config.titleField) {
      searchFields.add(config.titleField);
    }
    this.config = {
      tableName: this.#generateTableName(),
      label: this.label,
      titleField: config.titleField as string || "id",
      idMode: config.idMode || "ulid",
      searchFields: Array.from(searchFields),
      description: this.description ||
        `${this.label} entry type for InSpatial ORM`,
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

    this.#setupActions(config.actions);
    this.#setupHooks(config.hooks);
  }

  #setupActions(
    actions?: Array<EntryActionDefinition<any>>,
  ): void {
    if (!actions) {
      return;
    }
    for (const action of actions) {
      if (this.actions.has(action.key)) {
        raiseORMException(
          `Action with key ${action.key} already exists in EntryType ${this.name}`,
        );
      }
      this.actions.set(action.key, action);
    }
  }
  #setupHooks(
    hooks?: Partial<Record<EntryHookName, Array<EntryHookDefinition<E>>>>,
  ): void {
    if (!hooks) {
      return;
    }
    this.hooks = {
      ...this.hooks,
      ...hooks,
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
