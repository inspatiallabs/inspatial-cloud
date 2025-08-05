import type { EntryType } from "~/orm/entry/entry-type.ts";
import type { InField, InFieldMap } from "~/orm/field/field-def-types.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";
import type { ChildEntryType } from "~/orm/child-entry/child-entry.ts";
import type { Role } from "../roles/role.ts";
import { ChildEntry } from "@inspatial/cloud";
import { RegisterFieldConfig } from "../registry/connection-registry.ts";

export function buildConnectionFields(
  role: Role,
  entryOrSettingsOrChildType: EntryType | SettingsType | ChildEntryType,
): void {
  for (const field of entryOrSettingsOrChildType.fields.values()) {
    switch (field.type) {
      case "ImageField":
      case "FileField":
        setFileConnection(role, field, entryOrSettingsOrChildType);
        continue;
      case "ConnectionField":
        break;
      default:
        continue;
    }
    let connectionEntryType: EntryType;
    try {
      connectionEntryType = role.getEntryType(field.entryType);
    } catch (_e) {
      raiseORMException(
        `Connection entry '${field.entryType}' of field '${field.key}', in '${entryOrSettingsOrChildType.name}' does not exist for role '${role.label}'`,
        "Invalid Connection",
      );
    }
    const titleField = buildConnectionTitleField(
      field,
      connectionEntryType,
    );
    if (!titleField) {
      continue;
    }
    field.connectionIdMode = connectionEntryType.config.idMode;

    entryOrSettingsOrChildType.connectionTitleFields.set(field.key, titleField);
    if (!field.hidden) {
      entryOrSettingsOrChildType.info.titleFields.push(titleField);
    }
  }
  for (
    const titleField of entryOrSettingsOrChildType.connectionTitleFields
      .values()
  ) {
    entryOrSettingsOrChildType.fields.set(titleField.key, titleField);
  }
}

function setFileConnection(
  role: Role,
  field: InFieldMap["ImageField"] | InFieldMap["FileField"],
  entryOrSettingsOrChildType: EntryType | SettingsType | ChildEntryType,
) {
  const fileEntryType = role.getEntryType("cloudFile");
  if (!fileEntryType) {
    raiseORMException(
      `File entry type 'cloudFile' does not exist`,
      "Invalid File Entry Type",
    );
  }
  const titleField = buildConnectionTitleField(
    field,
    fileEntryType,
  );
  if (!titleField) {
    return;
  }
  entryOrSettingsOrChildType.connectionTitleFields.set(field.key, titleField);
}

export function validateConnectionFields(
  role: Role,
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

    if (!role.entryTypes.has(field.entryType)) {
      raiseORMException(
        `Connection entry '${field.entryType}' of field '${field.key}', in '${entryOrSettingsType.name}' EntryType does not exist`,
        "Invalid Connection",
      );
    }
  }
}
export function registerFetchFields(
  role: Role,
  entryType: EntryType,
): void {
  for (const field of entryType.fields.values()) {
    registerField(role, {
      entryName: entryType.name,
      childOrEntryType: entryType,
      field,
    });
  }
  for (const child of entryType.children?.values() || []) {
    for (const field of child.fields.values()) {
      registerField(role, {
        entryName: entryType.name,
        childOrEntryType: child,
        field,
      });
    }
  }
}

function registerField(role: Role, args: {
  entryName: string;
  childOrEntryType: ChildEntryType | EntryType;
  field: InField;
}) {
  const { field, entryName, childOrEntryType } = args;
  if (!field.fetchField) {
    return;
  }
  const fetchOptions = field.fetchField!;
  const connectionIdField = childOrEntryType.fields.get(
    fetchOptions.connectionField,
  ) as InField<"ConnectionField">;
  const referencedEntryType = role.getEntryType(connectionIdField.entryType);
  const referencedField = referencedEntryType.fields.get(
    fetchOptions.fetchField,
  );

  if (!referencedField) {
    raiseORMException(
      "InvalidField",
      `Connection field ${fetchOptions.fetchField} does not exist on entry type ${referencedEntryType.name}`,
    );
  }
  const config: RegisterFieldConfig = {
    referencingEntryType: entryName,
    referencingFieldKey: field.key,
    referencingIdFieldKey: connectionIdField.key,
    referencedEntryType: referencedEntryType.name,
    referencedFieldKey: referencedField.key,
  };
  if ("isChild" in childOrEntryType && childOrEntryType.isChild) {
    config.referencingChildFieldKey = childOrEntryType.name;
    role.registry.registerField(config);
  }
}
function buildConnectionTitleField(
  field:
    | InFieldMap["ConnectionField"]
    | InFieldMap["FileField"]
    | InFieldMap["ImageField"],
  connectionEntryType: EntryType,
): InField | undefined {
  const titleFieldKey = connectionEntryType.config.titleField;
  if (!titleFieldKey || titleFieldKey === "id") {
    return;
  }

  const entryTitleField = connectionEntryType.fields.get(titleFieldKey);
  if (!entryTitleField) {
    return;
  }

  const titleField = {
    ...entryTitleField,
    key: `${field.key}__title`,
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
