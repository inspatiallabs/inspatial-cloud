import { InSpatialORM } from "#/inspatial-orm.ts";
import { EntryType } from "#/entry/entry-type.ts";
import { FieldDefMap, ORMFieldDef } from "#/field/field-def-types.ts";

export function buildEntryType(
  orm: InSpatialORM,
  entryType: EntryType,
) {
  // if (entryType.config.statusField) {
  //   entryType.statusField = entryType.config.statusField;
  // }
  buildConnectionFields(orm, entryType);
  // buildChildren(orm, entryType);
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

function buildConnectionFields(orm: InSpatialORM, entryType: EntryType) {
  for (const field of entryType.fields.values()) {
    if (field.type !== "ConnectionField") {
      continue;
    }
    const connectionEntryType = orm.getEntryType(field.entryType);
    const titleField = buildConnectionTitleField(
      orm,
      field,
      connectionEntryType,
    );
    if (!titleField) {
      continue;
    }
    field.connectionIdMode = connectionEntryType.config.idMode;

    entryType.connectionTitleFields.set(field.key, titleField);
  }
}

function buildConnectionTitleField(
  orm: InSpatialORM,
  field: FieldDefMap["ConnectionField"],
  connectionEntryType: EntryType,
) {
  const titleFieldKey = connectionEntryType.config.titleField;
  if (!titleFieldKey) {
    return;
  }

  const entryTitleField = connectionEntryType.fields.get(titleFieldKey);
  if (!entryTitleField) {
    return;
  }

  const titleField = {
    ...entryTitleField,
    key: `_${field.key}Title`,
    readOnly: true,
    label: `${field.label} Title`,
    fetchField: {
      connectionField: field.key,
      fetchField: titleFieldKey,
    },
  } as ORMFieldDef;

  return titleField;
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
// function buildChildren(orm: EasyOrm, entryType: EntryType) {
//   for (const child of entryType.children) {
//     buildChild(orm, child);
//   }
// }

// function buildChild(orm: EasyOrm, child: ChildListDefinition) {
//   const connectionFields = child.fields.filter((field) =>
//     field.fieldType === "ConnectionField"
//   );
//   for (const field of connectionFields) {
//     const titleField = buildConnectionTitleField(orm, field);
//     if (!titleField) {
//       continue;
//     }

//     field.connectionTitleField = titleField.key as string;
//     field.connectionIdType = getConnectionIdType(
//       orm,
//       field.connectionEntryType!,
//     );
//     child.fields.push(titleField);
//   }
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
