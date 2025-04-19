import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { EntryType } from "#/orm/entry/entry-type.ts";
import { validateConnectionFields } from "#/orm/setup/setup-utils.ts";

export function validateEntryType(
  orm: InSpatialORM,
  entryType: EntryType,
): void {
  validateConnectionFields(orm, entryType);
  // validateFetchFields(orm, entryType);
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
