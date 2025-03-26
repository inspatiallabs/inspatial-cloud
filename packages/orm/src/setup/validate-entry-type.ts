import { InSpatialORM } from "#/inspatial-orm.ts";
import { EntryType } from "#/entry/entry-type.ts";
import { raiseORMException } from "#/orm-exception.ts";
import { SettingsType } from "#/settings/settings-type.ts";

export function validateEntryType(
  orm: InSpatialORM,
  entryType: EntryType,
) {
  validateConnectionFields(orm, entryType);
  // validateFetchFields(orm, entryType);
}

export function validateSettingsType(
  orm: InSpatialORM,
  settingsType: SettingsType,
) {
}

function validateConnectionFields(
  orm: InSpatialORM,
  entryOrSettingsType: EntryType | SettingsType,
) {
  for (const field of entryOrSettingsType.fields.values()) {
    if (field.type !== "ConnectionField") {
      continue;
    }
    if (field.type === "ConnectionField") {
      if (!field.entryType) {
        raiseORMException(
          `Connection field '${field.key}' in '${entryOrSettingsType.name}' is missing a connection EntryType`,
        );
      }
    }

    if (!orm.entryTypes.has(field.entryType)) {
      raiseORMException(
        `Connection entry '${field.entryType}' of field '${field.key}', in '${entryOrSettingsType.name}' EntryType does not exist`,
        "Invalid Connection",
      );
    }
  }
}

// function validateFetchFields(orm: EasyOrm, entryType: EntryTypeDef) {
//   const fields = entryType.fields.filter((field) => field.fetchOptions);
//   for (const field of fields) {
//     const fetchOptions = field.fetchOptions!;
//     if (!orm.hasEntryType(fetchOptions.fetchEntryType)) {
//       raiseOrmException(
//         "InvalidConnection",
//         `Connection entry ${fetchOptions.fetchEntryType} does not exist`,
//       );
//     }
//     const connectionEntryType = orm.getEntryType(
//       fetchOptions.fetchEntryType,
//     );

//     const connectedField = connectionEntryType.fields.filter((f) => {
//       return f.key === fetchOptions.thatFieldKey;
//     });

//     if (!connectedField) {
//       raiseOrmException(
//         "InvalidField",
//         `Connection field ${fetchOptions.thatFieldKey} does not exist on entry type ${fetchOptions.fetchEntryType}`,
//       );
//     }
//     orm.registry.registerFetchField({
//       source: {
//         entryType: entryType.entryType,
//         field: fetchOptions.thisFieldKey,
//       },
//       target: {
//         entryType: fetchOptions.fetchEntryType,
//         idKey: fetchOptions.thisIdKey,
//         field: fetchOptions.thatFieldKey,
//       },
//     });
//   }
// }
