import type { InSpatialORM } from "#/inspatial-orm.ts";
import type { InSpatialDB } from "#db/inspatial-db.ts";
import type { FieldDefMap, ORMFieldDef } from "#/field/field-def-types.ts";
import type { ORMField } from "#/field/orm-field.ts";
import { raiseORMException } from "#/orm-exception.ts";
import type { SettingsActionDefinition } from "#/settings/types.ts";
import type { EntryActionDefinition } from "#/entry/types.ts";

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

  readonly _user?: Record<string, any>;
  _actions: Map<string, EntryActionDefinition | SettingsActionDefinition> =
    new Map();
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

  #getAndValidateAction(
    actionKey: string,
    data?: Record<string, any>,
  ): EntryActionDefinition | SettingsActionDefinition {
    const dataMap = new Map(Object.entries(data || {}));
    const action = this._actions.get(actionKey);
    if (!action) {
      raiseORMException(
        `Action ${actionKey} not found in entry type ${this._name}`,
      );
    }
    if (action.params) {
      for (const param of action.params) {
        if (param.required && !dataMap.has(param.key)) {
          raiseORMException(
            `Missing required param ${param.key} for action ${actionKey} in entry type ${this._name}`,
          );
        }
      }
    }
    return action;
  }
}
