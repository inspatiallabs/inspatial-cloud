import { BaseType } from "#/orm/shared/base-type-class.ts";
import type { FieldDefMap, ORMFieldDef } from "#/orm/field/field-def-types.ts";
import { inLog } from "#/in-log/in-log.ts";
import { BaseTypeConfig, BaseTypeInfo } from "#/orm/shared/shared-types.ts";
import { raiseORMException } from "#/orm/orm-exception.ts";
import { convertString, generateId } from "#/utils/mod.ts";
import { InSpatialORM } from "#/orm/inspatial-orm.ts";
import { ORMField } from "#/orm/field/orm-field.ts";
import ulid from "#/orm/utils/ulid.ts";
import { dateUtils } from "#/utils/date-utils.ts";
export interface ChildEntry {
  [key: string]: any;
}
export class ChildEntry {
  // id: string | undefined;
  // createdAt: number | undefined;
  // updatedAt: number | undefined;
  // parent: string | undefined;
  _data: Map<string, any> = new Map();
  _getFieldDef: (fieldKey: string) => ORMFieldDef;
  _getFieldType: (fieldType: string) => ORMField<any>;
  _modifiedValues: Map<string, { from: any; to: any }> = new Map();
  constructor(getFieldDef: any, getFieldType: any) {
    this._getFieldDef = getFieldDef;
    this._getFieldType = getFieldType;
  }
}

export class ChildEntryList<T = Record<string, unknown>> {
  _name: string = "";
  _childClass: typeof ChildEntry = ChildEntry;
  _fields: Map<string, ORMFieldDef> = new Map();
  _orm!: InSpatialORM;
  _tableName: string = "";
  _data: Array<ChildEntry> = [];
  _parentId: string = "";
  _getFieldType<T extends keyof FieldDefMap>(fieldType: T): ORMField<T> {
    const fieldTypeDef = this._orm.fieldTypes.get(fieldType);
    if (!fieldTypeDef) {
      raiseORMException(
        `Field type ${fieldType} does not exist in ORM`,
      );
    }
    return fieldTypeDef as unknown as ORMField<T>;
  }
  _getFieldDef<T extends keyof FieldDefMap>(fieldKey: string): FieldDefMap[T] {
    const fieldDef = this._fields.get(fieldKey);
    if (!fieldDef) {
      raiseORMException(
        `Field with key ${fieldKey} does not exist in EntryType ${this._name}`,
      );
    }
    return fieldDef as unknown as FieldDefMap[T];
  }
  constructor(orm: InSpatialORM) {
    this._orm = orm;
  }

  get data(): Array<any> {
    return this._data.map((child) => {
      const childData = Object.fromEntries(child._data.entries());
      return childData;
    });
  }
  async load(parentId: string): Promise<void> {
    this._data = [];
    this._parentId = parentId;
    const children = await this._orm.db.getRows(
      this._tableName,
      {
        columns: "*",
        filter: {
          parent: this._parentId,
        },
      },
    );
    for (const childRow of children.rows) {
      const child = new this._childClass(this._getFieldDef, this._getFieldType);
      for (const [key, value] of Object.entries(childRow)) {
        const fieldDef = this._getFieldDef(key);
        const fieldType = this._getFieldType(fieldDef.type);
        child._data.set(key, fieldType.parseDbValue(value, fieldDef));
      }
      this._data.push(child);
    }
  }
  async clear(): Promise<void> {
    await this._orm.db.deleteRows(this._tableName, {
      parent: this._parentId,
    });

    await this.load(this._parentId);
  }
  async deleteStaleRecords(): Promise<void> {
    const dbRecords = await this._orm.db.getRows(this._tableName, {
      filter: {
        parent: this._parentId,
      },
      columns: ["id"],
    });

    const dbIds = dbRecords.rows.map((row) => row.id as string);
    const staleIds = dbIds.filter((id) =>
      !this._data.some((r) => r._data.get("id") === id)
    );
    for (const id of staleIds) {
      await this._orm.db.deleteRow(this._tableName, id);
    }
  }
  update(data: Array<Record<string, unknown>>): void {
    this._data = [];

    for (const row of data) {
      const child = new this._childClass(
        this._getFieldDef.bind(this),
        this._getFieldType.bind(this),
      );
      for (const [key, value] of Object.entries(row)) {
        if (this._fields.has(key)) {
          child[key as keyof typeof child] = value;
        }
      }
      this._data.push(child);
    }
  }
  async save(): Promise<void> {
    for (const childEntry of this._data) {
      childEntry.parent = this._parentId;
      await this.#refreshFetchedFields(childEntry);

      childEntry.updatedAt = dateUtils.nowTimestamp();
      if (!childEntry.id) {
        childEntry.createdAt = dateUtils.nowTimestamp();
      }

      const data: Record<string, any> = {};
      for (const [key, value] of childEntry._data.entries()) {
        const fieldDef = this._getFieldDef(key);
        const fieldType = this._getFieldType(fieldDef.type);
        data[key] = fieldType.prepareForDB(value, fieldDef);
      }
      if (childEntry.id) {
        await this._orm.db.updateRow(
          this._tableName,
          childEntry.id,
          data,
        );
        return;
      }
      data.id = ulid();
      childEntry.id = data.id;

      await this._orm.db.insertRow(this._tableName, data);
    }

    await this.deleteStaleRecords();
    this.load(this._parentId);
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
    fields: Array<ORMFieldDef>;
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
  setParentEntryType(parentEntryType: string): void {
    this.fields.set("parent", {
      key: "parent",
      label: "Parent",
      type: "ConnectionField",
      entryType: parentEntryType,
      required: true,
    });
    this.config.parentEntryType = parentEntryType;
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
