import type { EntryType } from "#/entry/entry-type.ts";

import { Entry } from "#/entry/entry.ts";
import type { InSpatialORM } from "#/inspatial-orm.ts";
import { raiseORMException } from "#/orm-exception.ts";
import type { EntryActionDefinition } from "#/entry/types.ts";
import type { ORMFieldDef } from "#/field/field-def-types.ts";

export function buildEntry(entryType: EntryType) {
  const changeableFields = new Map<string, ORMFieldDef>();
  for (const field of entryType.fields.values()) {
    if (
      !field.readOnly && !field.hidden &&
      !["id", "updatedAt", "changedAt"].includes(field.key)
    ) {
      changeableFields.set(field.key, field);
    }
  }
  entryType.config;
  const entryClass = class extends Entry<any> {
    override _fields: Map<string, ORMFieldDef> = entryType.fields;
    override _changeableFields = changeableFields;
    override _actions: Map<string, EntryActionDefinition> = entryType.actions;

    constructor(orm: InSpatialORM) {
      super(orm, entryType.name);
    }
  };

  makeFields(entryType, entryClass);

  return entryClass;
}

function makeFields(entryType: EntryType, entryClass: typeof Entry) {
  const fields = entryType.fields;
  for (const field of fields.values()) {
    Object.defineProperty(entryClass.prototype, field.key, {
      enumerable: true,
      get() {
        if (!(this as Entry)._data.has(field.key)) {
          (this as Entry)._data.set(field.key, null);
        }
        return (this as Entry)._data.get(field.key);
      },
      set(value) {
        const entry = this as Entry;
        const fieldType = entry._getFieldType(field.type);
        const fieldDef = entry._getFieldDef(field.key);
        value = fieldType.normalize(value, fieldDef);
        const existingValue = entry._data.get(field.key);
        if (existingValue === value) {
          return;
        }
        entry._modifiedValues.set(field.key, {
          from: existingValue,
          to: value,
        });
        const isValid = fieldType.validate(value, fieldDef);
        if (!isValid) {
          raiseORMException(
            `${value} is not a valid value for field ${field.key} in entry ${entry._name}`,
          );
        }
        entry._data.set(field.key, value);
      },
    });
  }
}
