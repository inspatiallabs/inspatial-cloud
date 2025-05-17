import type { EntryType } from "#/orm/entry/entry-type.ts";
import { buildConnectionFields } from "#/orm/setup/setup-utils.ts";
import type { Role } from "#/orm/roles/role.ts";

export function buildEntryType(
  role: Role,
  entryType: EntryType,
): void {
  // if (entryType.config.statusField) {
  //   entryType.statusField = entryType.config.statusField;
  // }
  buildConnectionFields(role, entryType);
  if (!entryType.children) {
    return;
  }
  for (const child of entryType.children.values()) {
    buildConnectionFields(role, child);
  }
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
