import type { EntryType } from "#/orm/entry/entry-type.ts";

import { Entry } from "#/orm/entry/entry.ts";
import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { EntryActionDefinition } from "#/orm/entry/types.ts";
import type { ORMFieldDef } from "#/orm/field/field-def-types.ts";
import { makeFields } from "#/orm/build/make-fields.ts";

export function buildEntry(entryType: EntryType): typeof Entry {
  const changeableFields = new Map<string, ORMFieldDef>();
  for (const field of entryType.fields.values()) {
    if (
      !field.readOnly && !field.hidden &&
      !["id", "updatedAt", "changedAt"].includes(field.key)
    ) {
      changeableFields.set(field.key, field);
    }
  }
  const entryClass = class extends Entry<any> {
    override _fields: Map<string, ORMFieldDef> = entryType.fields;
    override _changeableFields = changeableFields;
    override _titleFields: Map<string, ORMFieldDef> =
      entryType.connectionTitleFields;
    override _actions: Map<string, EntryActionDefinition> = entryType.actions;

    constructor(orm: InSpatialORM) {
      super(orm, entryType.name);
    }
  };

  makeFields("entry", entryType, entryClass);

  return entryClass;
}
