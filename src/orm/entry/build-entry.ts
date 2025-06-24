import type { EntryType } from "/orm/entry/entry-type.ts";

import { Entry } from "/orm/entry/entry.ts";
import type { InSpatialORM } from "/orm/inspatial-orm.ts";
import type { EntryActionDefinition } from "/orm/entry/types.ts";
import { makeFields } from "/orm/build/make-fields.ts";
import { buildChildren } from "/orm/child-entry/build-children.ts";
import type { InField } from "/orm/field/field-def-types.ts";
import type { InCloud } from "/cloud/cloud-common.ts";

export function buildEntry(entryType: EntryType): typeof Entry {
  const changeableFields = new Map<string, InField>();
  for (const field of entryType.fields.values()) {
    if (
      !field.readOnly && !field.hidden &&
      !["id", "updatedAt", "changedAt"].includes(field.key)
    ) {
      changeableFields.set(field.key, field);
    }
  }
  const childrenClasses = buildChildren(entryType);
  const entryClass = class extends Entry<any> {
    override _fields: Map<string, InField> = entryType.fields;
    override _changeableFields = changeableFields;
    override _titleFields: Map<string, InField> =
      entryType.connectionTitleFields;
    override _actions: Map<string, EntryActionDefinition> = entryType.actions;
    override _childrenClasses = childrenClasses;
    override readonly _entryType = entryType;

    constructor(orm: InSpatialORM, inCloud: InCloud) {
      super(orm, inCloud, entryType.name);
      this._setupChildren();
    }
  };

  makeFields("entry", entryType, entryClass);

  return entryClass;
}
