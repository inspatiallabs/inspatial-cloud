import type {
  ActionParam,
  EntryActionConfig,
  EntryActionDefinition,
  EntryConfig,
  EntryConnection,
  EntryHookDefinition,
  EntryIndex,
  EntryTypeConfig,
} from "~/orm/entry/types.ts";
import type { EntryHookName } from "~/orm/orm-types.ts";
import { BaseType } from "~/orm/shared/base-type-class.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";
import convertString from "~/utils/convert-string.ts";
import type { EntryPermission } from "~/orm/roles/entry-permissions.ts";
import type { InField } from "@inspatial/cloud/types";
import { getCallerPath } from "../../utils/path-utils.ts";
import type { EntryFieldKeys } from "#types/mod.ts";
import { ChildEntryType } from "../child-entry/child-entry.ts";
/**
 * This class is used to define an Entry Type in the ORM.
 */
export class EntryType<
  E extends string = string,
> extends BaseType<E> {
  config: EntryTypeConfig;
  statusField: InField<"ChoicesField"> | undefined;
  imageField?: InField<"ImageField">;
  defaultListFields: Set<string> = new Set(["id"]);
  defaultSortField?: EntryFieldKeys<E>;
  defaultSortDirection?: "asc" | "desc" = "asc";
  actions: Map<string, EntryActionDefinition<E>> = new Map();
  connections: Array<EntryConnection> = [];
  hooks: Record<EntryHookName, Map<string, EntryHookDefinition<E>>> = {
    beforeUpdate: new Map(),
    afterCreate: new Map(),
    afterDelete: new Map(),
    afterUpdate: new Map(),
    beforeCreate: new Map(),
    beforeDelete: new Map(),
    beforeValidate: new Map(),
    validate: new Map(),
  };
  permission: EntryPermission;
  sourceConfig: EntryConfig<E>;
  constructor(
    name: E,
    config: EntryConfig<E>,
    rm?: boolean,
  ) {
    super(name, config);

    if (!rm) {
      this.dir = getCallerPath();
    }
    this.sourceConfig = {
      ...config,
    };
    this.defaultSortField = config.defaultSortField ||
      "id" as EntryFieldKeys<E>;
    this.defaultSortDirection = config.defaultSortDirection || "asc";
    this.permission = {
      create: true,
      view: true,
      modify: true,
      delete: true,
    };
    this.fields.set("id", {
      key: "id",
      type: "IDField",
      entryType: this.name,
      idMode: config.idMode || "ulid",
      label: config.label || "ID",
      readOnly: true,
      required: true,
    });

    if (
      config.idMode && typeof config.idMode === "object" &&
      config.idMode.type === "field"
    ) {
      const field = config.idMode.field;
      const fieldDef = this.fields.get(field);
      if (!fieldDef) {
        raiseORMException(
          `ID field ${field} does not exist in EntryType ${this.name}`,
        );
      }
      if (fieldDef.type !== "DataField") {
        raiseORMException(
          `ID field ${field.toString()} must be of type 'DataField' in EntryType ${this.name}`,
        );
      }
      fieldDef.unique = true;
      fieldDef.required = true;
    }

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
    this.fields.set("in__tags", {
      key: "in__tags",
      label: "Tags",
      type: "ArrayField",
      arrayType: "IntField",
      readOnly: true,
      description: `Tags associated with this ${this.label}`,
      required: false,
    });
    if (config.taggable) {
      this.defaultListFields.add("in__tags");
    }
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
      taggable: config.taggable || false,
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
    if (config.statusField) {
      const field = this.fields.get(config.statusField as string);
      if (field?.type !== "ChoicesField") {
        raiseORMException(
          `Status field ${config.statusField.toString()} must be of type ChoicesField in EntryType ${this.name}`,
        );
      }
      this.statusField = field;
    }

    if (config.imageField) {
      const field = this.fields.get(config.imageField as string);
      if (field?.type !== "ImageField") {
        raiseORMException(
          `Profile image field ${config.imageField.toString()} must be of type ImageField in EntryType ${this.name}`,
        );
      }
      this.imageField = field;
    }

    this.info = {
      config: this.config,
      actions: Array.from(this.actions.values()).filter((action) =>
        !action.private
      ),
      permission: this.permission,
      displayFields: Array.from(this.displayFields.values()),
      statusField: this.statusField,
      imageField: this.imageField,
      defaultListFields: Array.from(this.defaultListFields).map((f) =>
        this.fields.get(f)!
      ),
      connections: Array.from(this.connections.values()),
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
      setupAction(action);
      this.actions.set(action.key, action);
    }
  }
  #setupHooks(
    hooks?: Partial<Record<EntryHookName, Array<EntryHookDefinition<E>>>>,
  ): void {
    if (!hooks) {
      return;
    }
    for (
      const [hookName, hookList] of Object.entries(hooks) as Array<
        [EntryHookName, Array<EntryHookDefinition<E>>]
      >
    ) {
      for (const hook of hookList) {
        this.addHook(hookName, hook);
      }
    }
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
  addHook(hookName: EntryHookName, hook: EntryHookDefinition<E>): void {
    const hookMap = this.hooks[hookName];
    if (hookMap.has(hook.name)) {
      raiseORMException(
        `Hook with name ${hook.name} already exists for ${hookName} in EntryType ${this.name}`,
      );
    }
    hookMap.set(hook.name, hook);
  }
  addChild(childName: string, config: {
    label?: string;
    description?: string;
    fields: InField[];
  }): void {
    const child = new ChildEntryType(childName, config);
    this.sourceConfig.children = [
      ...(this.sourceConfig.children || []),
      child,
    ];
    this._addChild(child);
    child.setParentEntryType(this.name);
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
    setupAction(action);
    this.actions.set(action.key, action as any);
    this.info = {
      ...this.info,
      actions: Array.from(this.actions.values()).filter((action) =>
        !action.private
      ),
    };
  }
}

function setupAction(action: EntryActionConfig<any, any, any>): void {
  if (!action.label) {
    action.label = convertString(action.key, "title", true);
  }
  for (const param of action.params) {
    if (!param.label) {
      param.label = convertString(param.key, "title", true);
    }
  }
}

/** Define a new Entry Type for the ORM
 *
 * @param entryName - The camelCase name of the entry type
 * @param config - The configuration for the entry type
 * @returns An instance of `EntryType` that can be added to your cloud extension
 */
export function defineEntry<
  N extends string,
>(
  entryName: N,
  config: EntryConfig<N>,
): EntryType<N> {
  return new EntryType(entryName, config);
}
