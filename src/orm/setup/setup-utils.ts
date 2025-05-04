import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { EntryType } from "#/orm/entry/entry-type.ts";
import type { InField, InFieldMap } from "#/orm/field/field-def-types.ts";
import type { SettingsType } from "#/orm/settings/settings-type.ts";
import { raiseORMException } from "#/orm/orm-exception.ts";
import type { ChildEntryType } from "#/orm/child-entry/child-entry.ts";

export function buildConnectionFields(
  orm: InSpatialORM,
  entryOrSettingsOrChildType: EntryType | SettingsType | ChildEntryType,
): void {
  for (const field of entryOrSettingsOrChildType.fields.values()) {
    switch (field.type) {
      case "ImageField":
      case "FileField":
        setFileConnection(orm, field, entryOrSettingsOrChildType);
        continue;
      case "ConnectionField":
        break;
      default:
        continue;
    }
    let connectionEntryType: EntryType;
    try {
      connectionEntryType = orm.getEntryType(field.entryType);
    } catch (_e) {
      raiseORMException(
        `Connection entry '${field.entryType}' of field '${field.key}', in '${entryOrSettingsOrChildType.name}' does not exist`,
        "Invalid Connection",
      );
    }
    const titleField = buildConnectionTitleField(
      orm,
      field,
      connectionEntryType,
    );
    if (!titleField) {
      continue;
    }
    field.connectionIdMode = connectionEntryType.config.idMode;

    entryOrSettingsOrChildType.connectionTitleFields.set(field.key, titleField);
  }
  for (
    const titleField of entryOrSettingsOrChildType.connectionTitleFields
      .values()
  ) {
    entryOrSettingsOrChildType.fields.set(titleField.key, titleField);
  }
}

function setFileConnection(
  orm: InSpatialORM,
  field: InFieldMap["ImageField"] | InFieldMap["FileField"],
  entryOrSettingsOrChildType: EntryType | SettingsType | ChildEntryType,
) {
  const fileEntryType = orm.getEntryType("cloudFile");
  if (!fileEntryType) {
    raiseORMException(
      `File entry type 'cloudFile' does not exist`,
      "Invalid File Entry Type",
    );
  }
  const titleField = buildConnectionTitleField(
    orm,
    field,
    fileEntryType,
  );
  if (!titleField) {
    return;
  }
  entryOrSettingsOrChildType.connectionTitleFields.set(field.key, titleField);
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
  _orm: InSpatialORM,
  field:
    | InFieldMap["ConnectionField"]
    | InFieldMap["FileField"]
    | InFieldMap["ImageField"],
  connectionEntryType: EntryType,
): InField | undefined {
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
    required: false,
    unique: false,
    label: `${field.label} Title`,
    fetchField: {
      connectionField: field.key,
      fetchField: titleFieldKey,
    },
  } as InField;

  return titleField;
}
