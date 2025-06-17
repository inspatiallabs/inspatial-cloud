import type {
  ActionParam,
  EntryActionConfig,
  EntryActionDefinition,
  EntryHookDefinition,
  EntryIndex,
  EntryTypeConfig,
  ExtractFieldKeys,
} from "#/orm/entry/types.ts";
import type { EntryBase, GenericEntry } from "#/orm/entry/entry-base.ts";
import type { EntryHookName } from "#/orm/orm-types.ts";
import { BaseType } from "#/orm/shared/base-type-class.ts";
import type { IDMode } from "#/orm/field/types.ts";
import { raiseORMException } from "#/orm/orm-exception.ts";
import convertString from "#/utils/convert-string.ts";
import type { BaseConfig } from "#/orm/shared/shared-types.ts";

/**
 * This class is used to define an Entry Type in the ORM.
 */
export class EntryType<
  E extends EntryBase = GenericEntry,
  N extends string = string,
  A extends Array<EntryActionDefinition<E>> = Array<
    EntryActionDefinition<E>
  >,
  FK extends PropertyKey = ExtractFieldKeys<E>,
> extends BaseType<N> {
  config: EntryTypeConfig;
  defaultListFields: Set<string> = new Set(["id"]);
  defaultSortField?: FK;
  defaultSortDirection?: "asc" | "desc" = "asc";
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
  constructor(
    name: N,
    config: BaseConfig<FK> & {
      /**
       * The field to use as the display value instead of the ID.
       */
      titleField?: FK;
      idMode?: IDMode;
      imageField?: FK;
      defaultListFields?: Array<FK>;
      defaultSortField?: FK;
      defaultSortDirection?: "asc" | "desc";
      searchFields?: Array<FK>;
      index?: Array<EntryIndex<FK>>;
      actions?: A;
      hooks?: Partial<Record<EntryHookName, Array<EntryHookDefinition<E>>>>;
      roles?: Array<unknown>;
    },
  ) {
    super(name, config);
    this.defaultSortField = config.defaultSortField || "id" as FK;
    this.defaultSortDirection = config.defaultSortDirection || "asc";
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
      index: config.index as Array<EntryIndex<string>> || [],
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
    this.defaultListFields.add("updatedAt");
    this.defaultListFields.add("createdAt");
    if (this.config.titleField) {
      this.defaultListFields.add(this.config.titleField);
    }
    this.#setChildrenParent();
    this.#setupActions(config.actions);
    this.#setupHooks(config.hooks);
    this.#validateIndexFields();
    this.info = {
      config: this.config,
      actions: Array.from(this.actions.values()).filter((action) =>
        !action.private
      ),
      displayFields: Array.from(this.displayFields.values()),
      defaultListFields: Array.from(this.defaultListFields).map((f) =>
        this.fields.get(f)!
      ),
    };
  }
  #setChildrenParent() {
    if (!this.children) {
      return;
    }
    for (const child of this.children.values()) {
      child.setParentEntryType(this.name);
    }
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

  #generateTableName(): string {
    const snakeName = convertString(this.name, "snake", true);
    return `entry_${snakeName}`;
  }

  #validateIndexFields(): void {
    for (const index of this.config.index) {
      index.fields.forEach((field) => {
        if (!this.fields.has(field)) {
          raiseORMException(
            `field ${field} is not a valid field for and index on ${this.name}`,
          );
        }
      });
    }
  }

  addAction<
    K extends PropertyKey = PropertyKey,
    P extends Array<ActionParam<K>> = Array<ActionParam<K>>,
  >(action: EntryActionConfig<E, K, P>): void {
    if (this.actions.has(action.key)) {
      raiseORMException(
        `Action with key ${action.key} already exists in EntryType ${this.name}`,
      );
    }
    this.actions.set(action.key, action as any);
    this.info = {
      ...this.info,
      actions: Array.from(this.actions.values()).filter((action) =>
        !action.private
      ),
    };
  }
}
