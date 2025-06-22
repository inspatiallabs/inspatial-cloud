import { BaseType } from "/orm/shared/base-type-class.ts";
import type { InField, InFieldMap } from "/orm/field/field-def-types.ts";
import { inLog } from "/in-log/in-log.ts";
import type { BaseTypeConfig, BaseTypeInfo } from "/orm/shared/shared-types.ts";
import { raiseORMException } from "/orm/orm-exception.ts";
import { convertString } from "/utils/mod.ts";
import type { InSpatialORM } from "/orm/inspatial-orm.ts";
import type { ORMFieldConfig } from "/orm/field/orm-field.ts";
import ulid from "/orm/utils/ulid.ts";
import { dateUtils } from "/utils/date-utils.ts";
export interface ChildEntry<T extends Record<string, unknown>> {
  [key: string]: any;
}
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
  _changeableFields: Map<string, InField> = new Map();
  _orm!: InSpatialORM;
  _tableName: string = "";
  _data: Map<string, ChildEntry<T>> = new Map();
  _newData: Map<string, ChildEntry<T>> = new Map();
  _parentId: string = "";
  _getFieldType<T extends keyof InFieldMap>(fieldType: T): ORMFieldConfig<T> {
    const fieldTypeDef = this._orm.fieldTypes.get(fieldType);
    if (!fieldTypeDef) {
      raiseORMException(
        `Field type ${fieldType} does not exist in ORM`,
      );
    }
    return fieldTypeDef as unknown as ORMFieldConfig<T>;
  }
  _getFieldDef<T extends keyof InFieldMap>(fieldKey: string): InFieldMap[T] {
    const fieldDef = this._fields.get(fieldKey);
    if (!fieldDef) {
      raiseORMException(
        `Field with key ${fieldKey} does not exist in EntryType ${this._name}`,
      );
    }
    return fieldDef as unknown as InFieldMap[T];
  }
  constructor(orm: InSpatialORM) {
    this._orm = orm;
  }

  get data(): Array<T> {
    const data = Array.from(
      this._data.values().map((child) => {
        const childData = Object.fromEntries(child._data.entries());
        return childData as T;
      }),
    );
    const newData = Array.from(
      this._newData.values().map((child) => {
        const childData = Object.fromEntries(child._data.entries());
        return childData as T;
      }),
    );
    return [...data, ...newData];
  }
  async load(parentId: string): Promise<void> {
    this._data = new Map();
    this._parentId = parentId;
    const children = await this._orm.db.getRows(
      this._tableName,
      {
        columns: "*",
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
  async clear(): Promise<void> {
    await this._orm.db.deleteRows(this._tableName, [{
      field: "parent",
      op: "=",
      value: this._parentId,
    }]);

    await this.load(this._parentId);
  }
  async deleteStaleRecords(): Promise<void> {
    const dbRecords = await this._orm.db.getRows<{ id: string }>(
      this._tableName,
      {
        filter: [{
          field: "parent",
          op: "=",
          value: this._parentId,
        }],
        columns: ["id"],
      },
    );

    for (const row of dbRecords.rows) {
      if (!this._data.has(row.id)) {
        await this._orm.db.deleteRow(this._tableName, row.id);
      }
    }
  }
  update(data: Array<Record<string, unknown>>): void {
    const rowsToRemove = new Set(this._data.keys());
    for (const row of data) {
      switch (typeof row.id) {
        case "string":
          rowsToRemove.delete(row.id);
          this.updateChild(row.id, row);
          break;
        default:
          this.addChild(row);
      }
    }
    for (const rowId of rowsToRemove) {
      this._data.delete(rowId);
    }
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
  updateChild(id: string, data: Record<string, unknown>): void {
    const child = this.getChild(id);
    for (const [key, value] of Object.entries(data)) {
      if (this._fields.has(key)) {
        child[key as keyof typeof child] = value;
      }
    }
  }
  addChild(data: Record<string, unknown>): void {
    const child = new this._childClass(
      this._getFieldDef.bind(this),
      this._getFieldType.bind(this),
    );

    for (const [key, value] of Object.entries(data)) {
      if (this._fields.has(key)) {
        child[key as keyof typeof child] = value;
      }
    }
    child.parent = this._parentId;
    if (typeof child.order != "number") {
      child.order = this._newData.size + 1;
    }
    this._newData.set(this._newData.size.toString(), child);
  }
  async save(): Promise<void> {
    for (const childEntry of this._data.values()) {
      await this.#refreshFetchedFields(childEntry);
      if (childEntry._modifiedValues.size === 0) {
        continue;
      }

      childEntry.updatedAt = dateUtils.nowTimestamp();

      const data: Record<string, any> = {};
      for (const [key, value] of childEntry._modifiedValues.entries()) {
        const fieldDef = this._getFieldDef(key);
        const fieldType = this._getFieldType(fieldDef.type);
        data[key] = fieldType.prepareForDB(value.to, fieldDef);
      }
      await this._orm.db.updateRow(
        this._tableName,
        childEntry.id,
        data,
      );
    }
    for (const childEntry of this._newData.values()) {
      await this.#refreshFetchedFields(childEntry);

      childEntry.createdAt = dateUtils.nowTimestamp();
      childEntry.updatedAt = dateUtils.nowTimestamp();
      childEntry.id = ulid();
      const data: Record<string, any> = {};
      for (const [key, value] of childEntry._data.entries()) {
        const fieldDef = this._getFieldDef(key);
        const fieldType = this._getFieldType(fieldDef.type);
        data[key] = fieldType.prepareForDB(value, fieldDef);
      }
      await this._orm.db.insertRow(
        this._tableName,
        data,
      );
      this._data.set(childEntry.id, childEntry);
    }

    await this.deleteStaleRecords();
    await this.load(this._parentId);
  }
  async #refreshFetchedFields(child: ChildEntry): Promise<void> {
    for (const field of this._fields.values()) {
      if (field.fetchField) {
        const def = this._getFieldDef<"ConnectionField">(
          field.fetchField.connectionField,
        );
        const value = await this._orm.db.getValue(
          `entry_${def.entryType}`,
          child._data.get(def.key),
          field.fetchField.fetchField,
        );
        child[field.key] = value;
      }
    }
  }
}

export interface ChildEntryConfig extends BaseTypeConfig {
  tableName?: string;
  parentEntryType?: string;
}

export class ChildEntryType<N extends string = any> extends BaseType<N> {
  config: ChildEntryConfig;
  constructor(name: N, config: {
    description?: string;
    label?: string;
    fields: Array<InField>;
  }) {
    if ("children" in config) {
      delete config.children;
      inLog.warn(`ChildEntryType ${name} should not have children, ignoring`);
    }
    super(name, config);
    this.config = {
      description: this.description,
      label: this.label,
    };
    this.fields.set("id", {
      key: "id",
      label: "ID",
      type: "IDField",
      idMode: "ulid",
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
      entryType: parentEntryType,
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
