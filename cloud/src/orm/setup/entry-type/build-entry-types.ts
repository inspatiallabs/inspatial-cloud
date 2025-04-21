import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { EntryType } from "#/orm/entry/entry-type.ts";
import { buildConnectionFields } from "#/orm/setup/setup-utils.ts";
import type { ChildEntryType } from "#/orm/child-entry/child-entry.ts";

export function buildEntryType(
  orm: InSpatialORM,
  entryType: EntryType,
): void {
  // if (entryType.config.statusField) {
  //   entryType.statusField = entryType.config.statusField;
  // }
  buildConnectionFields(orm, entryType);
  buildChildren(orm, entryType);
  // // const groups: FieldGroup[] = buildFieldGroups(entryType);
  // const listFields = buildListFields(entryType);
  // const displayFieldGroups = getFilteredDisplayFieldGroups(entryType, groups);

  // return {
  //   entryType: entryType.entryType,
  //   statusField: entryType.statusField,
  //   fields: entryType.fields,
  //   fieldGroups: groups,
  //   displayFieldGroups: displayFieldGroups,
  //   children: entryType.children,
  //   listFields: listFields,
  //   config: entryType.config as EntryTypeDef["config"],
  //   hooks: entryType.hooks,
  //   actions: entryType.actions,
  //   connections: [],
  // };
}
function buildChildren(orm: InSpatialORM, entryType: EntryType) {
  if (!entryType.children) {
    return;
  }
  for (const child of entryType.children.values()) {
    buildChild(orm, child);
  }
}

function buildChild(
  orm: InSpatialORM,
  child: ChildEntryType,
) {
  buildConnectionFields(orm, child);
}
// function getFilteredDisplayFieldGroups(
//   entryType: EntryType,
//   groups: FieldGroup[],
// ) {
//   const titleFields = entryType.fields.filter((f) =>
//     f.fieldType === "ConnectionField" && f.connectionTitleField
//   ).map((f) => f.connectionTitleField);
//   return groups.map((group) => {
//     return {
//       ...group,
//       fields: group.fields.filter((f: EasyField) => {
//         if (f.hidden) {
//           return false;
//         }
//         if (f.key === entryType.config.titleField && f.readOnly) {
//           return false;
//         }
//         return !titleFields.includes(f.key);
//       }),
//     };
//   }).filter((group) => group.fields.length > 0);
// }

// function buildListFields(entryType: EntryType) {
//   const listFields: Array<string> = [];

//   if (entryType.config.titleField) {
//     const titleField = entryType.fields.find((field) =>
//       field.key === entryType.config.titleField
//     );
//     if (titleField) {
//       titleField.inList = true;
//     }
//   }
//   for (const field of entryType.fields) {
//     if (field.inList) {
//       listFields.push(field.key);
//       if (field.connectionTitleField) {
//         listFields.push(field.connectionTitleField);
//       }
//     }
//   }
//   listFields.push("createdAt");
//   listFields.push("updatedAt");
//   listFields.push("id");
//   return listFields;
// }
