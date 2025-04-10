import type { InSpatialORM } from "#/inspatial-orm.ts";
import type { EntryType } from "#/entry/entry-type.ts";
import type { FieldDefMap, ORMFieldDef } from "#/field/field-def-types.ts";
import type { SettingsType } from "#/settings/settings-type.ts";
import { raiseORMException } from "#/orm-exception.ts";

export function buildConnectionFields(
  orm: InSpatialORM,
  entryOrSettingsType: EntryType | SettingsType,
): void {
  for (const field of entryOrSettingsType.fields.values()) {
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

    entryOrSettingsType.connectionTitleFields.set(field.key, titleField);
  }
  for (const titleField of entryOrSettingsType.connectionTitleFields.values()) {
    entryOrSettingsType.fields.set(titleField.key, titleField);
  }
}

export function validateConnectionFields(
  orm: InSpatialORM,
  entryOrSettingsType: EntryType | SettingsType,
): void {
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

function buildConnectionTitleField(
  orm: InSpatialORM,
  field: FieldDefMap["ConnectionField"],
  connectionEntryType: EntryType,
): ORMFieldDef | undefined {
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
    key: `${field.key}#`,
    readOnly: true,
    label: `${field.label} Title`,
    fetchField: {
      connectionField: field.key,
      fetchField: titleFieldKey,
    },
  } as ORMFieldDef;

  return titleField;
}
