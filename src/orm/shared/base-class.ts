import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { InSpatialDB } from "#/orm/db/inspatial-db.ts";
import type { InFieldMap, ORMFieldDef } from "#/orm/field/field-def-types.ts";
import type { ORMFieldConfig } from "#/orm/field/orm-field.ts";
import { raiseORMException } from "#/orm/orm-exception.ts";
import type { SettingsActionDefinition } from "#/orm/settings/types.ts";
import type { EntryActionDefinition } from "#/orm/entry/types.ts";
import type { ChildEntryList } from "#/orm/child-entry/child-entry.ts";
import { PgError } from "#/orm/db/postgres/pgError.ts";
import { PGErrorCode } from "#/orm/db/postgres/maps/errorMap.ts";
import convertString from "#/utils/convert-string.ts";

export class BaseClass<N extends string = string> {
  readonly _type: "settings" | "entry";
  _name: N;
  _orm: InSpatialORM;
  _db: InSpatialDB;
  _data: Map<string, any>;
  _modifiedValues: Map<string, { from: any; to: any }> = new Map();
  _fields: Map<string, ORMFieldDef> = new Map();
  _titleFields: Map<string, ORMFieldDef> = new Map();
  _changeableFields: Map<string, ORMFieldDef> = new Map();
  _childrenClasses: Map<string, typeof ChildEntryList> = new Map();
  _childrenData: Map<string, ChildEntryList> = new Map();
  readonly _user?: Record<string, any>;
  _actions: Map<string, EntryActionDefinition | SettingsActionDefinition> =
    new Map();
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

  constructor(
    orm: InSpatialORM,
    name: N,
    type: "settings" | "entry",
    user?: Record<string, any>,
  ) {
    this._user = user;
    this._type = type;
    this._name = name;
    this._orm = orm;
    this._db = orm.db;
    this._data = new Map();
    this._childrenData = new Map();
  }

  async runAction<T = void>(
    actionKey: string,
    data?: Record<string, any>,
  ): Promise<T> {
    const action = this.#getAndValidateAction(actionKey, data);

    data = data || {};
    return await action.action({
      orm: this._orm,
      data,
      [this._name]: this as any,
      [this._type]: this as any,
    });
  }
  _setupChildren(): void {
    this._childrenData.clear();
    for (const child of this._childrenClasses.values()) {
      const childList = new child(this._orm);
      this._childrenData.set(childList._name, childList);
    }
  }
  getChild(childName: string): ChildEntryList {
    if (!this._childrenData.has(childName)) {
      raiseORMException(
        `Child ${childName} not found in ${this._type} type ${this._name}`,
      );
    }
    return this._childrenData.get(childName)!;
  }
  async saveChildren(): Promise<void> {
    for (const child of this._childrenData.values()) {
      await child.save();
    }
  }
  async loadChildren(parentId: string): Promise<void> {
    for (const child of this._childrenData.values()) {
      await child.load(parentId);
    }
  }
  #getAndValidateAction(
    actionKey: string,
    data?: Record<string, any>,
  ): EntryActionDefinition | SettingsActionDefinition {
    const dataMap = new Map(Object.entries(data || {}));
    const action = this._actions.get(actionKey);
    if (!action) {
      raiseORMException(
        `Action ${actionKey} not found in ${this._type} type ${this._name}`,
      );
    }
    if (action.params) {
      for (const param of action.params) {
        if (param.required && !dataMap.has(param.key)) {
          raiseORMException(
            `Missing required param ${param.key} for action ${actionKey} in ${this._type} type ${this._name}`,
          );
        }
      }
    }
    return action;
  }
  async refreshFetchedFields(): Promise<void> {
    for (const field of this._fields.values()) {
      if (field.fetchField) {
        const def = this._getFieldDef<"ConnectionField">(
          field.fetchField.connectionField,
        );
        const value = await this._db.getValue(
          `entry_${def.entryType}`,
          this._data.get(def.key),
          field.fetchField.fetchField,
        );
        (this as any)[field.key] = value;
      }
    }
  }
  handlePGError(e: unknown): never {
    if (!(e instanceof PgError)) {
      throw e;
    }

    switch (e.code) {
      case PGErrorCode.NotNullViolation: {
        const fieldKey = convertString(e.fullMessage.columnName, "camel");
        raiseORMException(
          `Field ${fieldKey} is required for ${this._name}`,
          "RequiredField",
          400,
        );
        break;
      }
      case PGErrorCode.UniqueViolation: {
        const fieldKey = convertString(e.fullMessage.columnName, "camel");
        raiseORMException(
          `Field ${fieldKey} must be unique for ${this._name}`,
          "UniqueField",
          400,
        );
        break;
      }
      default:
        throw e;
    }
  }
}
