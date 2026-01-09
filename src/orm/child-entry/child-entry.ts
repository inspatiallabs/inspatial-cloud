import { BaseType } from "~/orm/shared/base-type-class.ts";
import type { InField, InFieldMap } from "~/orm/field/field-def-types.ts";
import type {
  BaseTypeConfig,
  BaseTypeInfo,
} from "~/orm/shared/shared-types.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";
import { convertString } from "~/utils/mod.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { ORMFieldConfig } from "~/orm/field/orm-field.ts";
import ulid from "~/orm/utils/ulid.ts";
import { dateUtils } from "~/utils/date-utils.ts";
import type { InSpatialDB } from "../db/inspatial-db.ts";
import type { DBFilter } from "../db/db-types.ts";
import { getInLog } from "#inLog";
import type { EntryName } from "#types/models.ts";
import type { IDMode } from "../field/types.ts";
export interface ChildEntry<T extends Record<string, unknown>> {
  _name?: string;
  [key: `$${string}`]: any;
}
type BuiltInFields = "id" | "createdAt" | "updatedAt" | "parent" | "order";
export class ChildEntry<
  T extends Record<string, unknown> = any,
> {
  // id: string | undefined;
  // createdAt: number | undefined;
  // updatedAt: number | undefined;
  // parent: string | undefined;
  _data: Map<string, T> = new Map();

  _getFieldDef: (fieldKey: string) => InField;
  _getFieldType: (fieldType: string) => ORMFieldConfig<any>;
  _modifiedValues: Map<string, { from: any; to: any }> = new Map();
  constructor(getFieldDef: any, getFieldType: any) {
    this._getFieldDef = getFieldDef;
    this._getFieldType = getFieldType;
  }
}

export class ChildEntryList<T extends Record<string, unknown> = any> {
  _name: string = "";
  _childClass: typeof ChildEntry = ChildEntry;
  _fields: Map<string, InField> = new Map();
  _titleFields: Map<string, InField> = new Map();
  rowsToRemove: Set<string> = new Set();
  _changeableFields: Map<string, InField> = new Map();
  _db: InSpatialDB;
  _tableName: string = "";
  _idMode: IDMode = "ulid";
  _data: Map<string, ChildEntry<T>> = new Map();
  _newData: Map<string, ChildEntry<T>> = new Map();
  _parentId: string = "";
  _getFieldType: (
    fieldType: keyof InFieldMap,
  ) => ORMFieldConfig<keyof InFieldMap>;
  _getFieldDef<T extends keyof InFieldMap>(fieldKey: string): InFieldMap[T] {
    const fieldDef = this._fields.get(fieldKey);
    if (!fieldDef) {
      raiseORMException(
        `Field with key ${fieldKey} does not exist in EntryType ${this._name}`,
      );
    }
    return fieldDef as unknown as InFieldMap[T];
  }
  constructor(orm: InSpatialORM, db: InSpatialDB) {
    this._db = db;
    this._getFieldType = (fieldType) => {
      const fieldTypeDef = orm.fieldTypes.get(fieldType);
      if (!fieldTypeDef) {
        raiseORMException(
          `Field type ${fieldType} does not exist in ORM`,
        );
      }
      return fieldTypeDef as unknown as ORMFieldConfig;
    };
  }

  get data(): Array<T & { id?: string; order: number }> {
    const data = Array.from(
      this._data.values().map((child) => {
        const childData = Object.fromEntries(child._data.entries());
        return childData as T & { id: string; order: number };
      }),
    );
    const newData = Array.from(
      this._newData.values().map((child) => {
        const childData = Object.fromEntries(child._data.entries());
        return childData as T & { order: number };
      }),
    );
    return [...data, ...newData];
  }
  async load(parentId: string): Promise<void> {
    this._data = new Map();
    this._newData.clear();
    this._parentId = parentId;
    const children = await this._db.getRows(
      this._tableName,
      {
        columns: "*",
        orderBy: "order",
        order: "asc",
        filter: [{
          field: "parent",
          op: "=",
          value: this._parentId,
        }],
      },
    );
    for (const childRow of children.rows) {
      const child = new this._childClass(
        this._getFieldDef.bind(this),
        this._getFieldType.bind(this),
      );
      for (const [key, value] of Object.entries(childRow)) {
        const fieldDef = this._getFieldDef(key);
        const fieldType = this._getFieldType(fieldDef.type);
        child._data.set(key, fieldType.parseDbValue(value, fieldDef) as any);
      }
      this._data.set(childRow.id, child);
    }
  }
  /**
   * Deletes all child records for the current parent ID.
   */
  async clear(): Promise<void> {
    await this._db.deleteRows(this._tableName, [{
      field: "parent",
      op: "=",
      value: this._parentId,
    }]);

    this._data.clear();
    this._newData.clear();
  }
  async deleteStaleRecords(): Promise<void> {
    const existingIds = Array.from(this._data.keys());
    if (existingIds.length <= 0 && this.rowsToRemove.size <= 0) {
      return;
    }
    const filters: DBFilter = [{
      field: "parent",
      op: "=",
      value: this._parentId,
    }];
    if (existingIds.length > 0) {
      filters.push({
        field: "id",
        op: "notInList",
        value: existingIds,
      });
    }
    await this._db.deleteRows(
      this._tableName,
      filters,
    );
    this.rowsToRemove.clear();
  }
  update(data: Array<T>): void {
    this._newData.clear();
    const rowsToRemove = new Set(this._data.keys());
    for (const row of data) {
      switch (typeof row.id) {
        case "string":
          rowsToRemove.delete(row.id);
          this.updateChild(row.id, row);
          break;
        default:
          this.add(row);
      }
    }

    for (const rowId of rowsToRemove) {
      this._data.delete(rowId);
    }
    this.rowsToRemove = rowsToRemove;
  }
  getChild(id: string): ChildEntry {
    const child = this._data.get(id);
    if (!child) {
      raiseORMException(
        `Child with id ${id} not found in entry type ${this._name}`,
      );
    }
    return child;
  }
  updateChild(id: string, data: Omit<T, BuiltInFields>): void {
    const child = this.getChild(id);
    for (const [key, value] of Object.entries(data)) {
      if (this._fields.has(key)) {
        child[`$${key}`] = value;
      }
    }
  }
  add(data: Omit<T, BuiltInFields>): void {
    const child = new this._childClass(
      this._getFieldDef.bind(this),
      this._getFieldType.bind(this),
    );

    for (const [key, value] of Object.entries(data)) {
      if (this._fields.has(key)) {
        child[`$${key}`] = value;
      }
    }
    child.$parent = this._parentId;
    if (typeof child.$order != "number") {
      child.$order = this._newData.size + 1;
    }
    this._newData.set(this._newData.size.toString(), child);
  }
  /** Returns the number of children, including unsaved ones */
  get count(): number {
    return this._data.size + this._newData.size;
  }
  get countNew(): number {
    return this._newData.size;
  }
  get countExisting(): number {
    return this._data.size;
  }
  async save(withParentId?: string): Promise<boolean> {
    let hasChanges = false;
    if (withParentId) {
      this._parentId = withParentId;
    }

    for (const childEntry of this._data.values()) {
      await this.#refreshFetchedFields(childEntry);
      if (childEntry._modifiedValues.size === 0) {
        continue;
      }
      hasChanges = true;
      childEntry.$updatedAt = dateUtils.nowTimestamp();
      if (withParentId) {
        childEntry.$parent = this._parentId;
      }
      const data: Record<string, any> = {};
      for (const [key, value] of childEntry._modifiedValues.entries()) {
        const fieldDef = this._getFieldDef(key);
        const fieldType = this._getFieldType(fieldDef.type);
        data[key] = fieldType.prepareForDB(value.to, fieldDef);
      }
      await this._db.updateRow(
        this._tableName,
        childEntry.$id,
        data,
      );
    }
    for (const childEntry of this._newData.values()) {
      hasChanges = true;
      await this.#refreshFetchedFields(childEntry);
      if (withParentId) {
        childEntry.$parent = this._parentId;
      }
      childEntry.$createdAt = dateUtils.nowTimestamp();
      childEntry.$updatedAt = dateUtils.nowTimestamp();
      // if(this._childClass)

      if (typeof this._idMode === "string") {
        childEntry.$id = ulid();
      } else if (this._idMode.type === "fields") {
        const { fields } = this._idMode;
        childEntry.$id = fields.map((field) => childEntry[`$${field}`]).join(
          ":",
        );
      } else {
        childEntry.$id = ulid();
      }
      const data: Record<string, any> = {};
      for (const [key, value] of childEntry._data.entries()) {
        const fieldDef = this._getFieldDef(key);
        const fieldType = this._getFieldType(fieldDef.type);
        data[key] = fieldType.prepareForDB(value, fieldDef);
      }
      await this._db.insertRow(
        this._tableName,
        data,
      );
      this._data.set(childEntry.$id, childEntry);
    }

    await this.deleteStaleRecords();
    await this.load(this._parentId);
    return hasChanges;
  }
  async #refreshFetchedFields(child: ChildEntry): Promise<void> {
    for (const field of this._fields.values()) {
      if (field.fetchField) {
        const def = this._getFieldDef<"ConnectionField">(
          field.fetchField.connectionField,
        );
        const value = await this._db.getValue(
          `entry_${def.entryType}`,
          child._data.get(def.key),
          field.fetchField.fetchField,
        );
        if (
          field.fetchField.onlyWhenValue && [undefined, null].includes(value)
        ) {
          continue;
        }

        child[`$${field.key}`] = value;
      }
    }
  }
}

export interface ChildEntryConfig extends BaseTypeConfig {
  tableName?: string;
  parentEntryType?: string;
  idMode?: IDMode;
}

export class ChildEntryType<N extends string = any> extends BaseType<N> {
  config: ChildEntryConfig;
  readonly isChild: boolean = true;
  constructor(name: N, config: {
    description?: string;
    label?: string;
    fields: Array<InField>;
    idMode?: IDMode;
  }) {
    if ("children" in config) {
      delete config.children;
      getInLog("cloud").warn(
        `ChildEntryType ${name} should not have children, ignoring`,
      );
    }
    super(name, config);
    this.config = {
      description: this.description,
      idMode: config.idMode,
      label: this.label,
    };
    this.fields.set("id", {
      key: "id",
      label: "ID",
      type: "IDField",
      entryType: this.name,
      idMode: config.idMode || "ulid",
      readOnly: true,
      required: true,
    });
    this.fields.set("order", {
      key: "order",
      label: "Order",
      type: "IntField",
      description: "The order of this child in the list",
    });
    this.fields.set("createdAt", {
      key: "createdAt",
      label: "Created At",
      type: "TimeStampField",
      readOnly: true,
      description: "The date and time this child was created",
      required: true,
    });
    this.fields.set("updatedAt", {
      key: "updatedAt",
      label: "Updated At",
      type: "TimeStampField",
      readOnly: true,
      description: "The date and time this child was last updated",
      required: true,
    });
  }
  setParentEntryType(parentEntryType: string, isSettings?: boolean): void {
    this.config.parentEntryType = parentEntryType;
    if (isSettings) {
      this.fields.set("parent", {
        key: "parent",
        label: "Parent",
        type: "DataField",
        required: true,
      });
      return;
    }
    this.fields.set("parent", {
      key: "parent",
      label: "Parent",
      type: "ConnectionField",
      entryType: parentEntryType as EntryName,
      required: true,
    });
  }
  generateTableName(): void {
    if (!this.config.parentEntryType) {
      raiseORMException(
        `ChildEntryType ${this.name} does not have a parentEntryType defined`,
      );
    }
    if (!this.config.tableName) {
      this.config.tableName = convertString(
        `child_${this.config.parentEntryType}_${this.name}`,
        "snake",
        true,
      );
    }
  }
}

export interface ChildEntryTypeInfo extends Omit<BaseTypeInfo, "children"> {
}

/** Defines a ChildEntryType */
export function defineChildEntry<N extends string>(
  name: N,
  config: {
    label?: string;
    description?: string;
    fields: Array<InField>;
    idMode?: IDMode;
  },
): ChildEntryType<N> {
  return new ChildEntryType(name, config);
}
