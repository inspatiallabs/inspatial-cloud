import type { EntryType } from "#/orm/entry/entry-type.ts";
import type { SettingsType } from "#/orm/settings/settings-type.ts";
import { ChildEntry, ChildEntryList } from "#/orm/child-entry/child-entry.ts";
import { makeFields } from "#/orm/build/make-fields.ts";
import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import { ORMFieldDef } from "#/orm/field/field-def-types.ts";

export function buildChildren(
  entryOrSettingsType: EntryType | SettingsType,
): Map<string, typeof ChildEntryList> {
  const childrenClasses = new Map<string, typeof ChildEntryList>();
  if (entryOrSettingsType.children) {
    for (const child of entryOrSettingsType.children.values()) {
      const changeableFields = new Map<string, ORMFieldDef>();
      for (const field of child.fields.values()) {
        if (
          !field.readOnly && !field.hidden &&
          !["id", "updatedAt", "changedAt"].includes(field.key)
        ) {
          changeableFields.set(field.key, field);
        }
      }
      const childClass = class extends ChildEntry {};
      makeFields("child", child, childClass);
      const childListClass = class extends ChildEntryList {
        override _name = child.name;
        override _childClass = childClass;
        override _fields = child.fields;
        override _tableName = child.config.tableName!;
        override _changeableFields = changeableFields;
        override _titleFields: Map<string, ORMFieldDef> =
          child.connectionTitleFields;

        constructor(orm: InSpatialORM) {
          super(orm);
        }
      };

      childrenClasses.set(child.name, childListClass);
    }
  }
  return childrenClasses;
}
