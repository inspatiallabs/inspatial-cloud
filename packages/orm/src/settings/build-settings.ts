import type { SettingsType } from "#/settings/settings-type.ts";
import { Settings } from "#/settings/settings.ts";
import type { ORMFieldDef } from "#/field/field-def-types.ts";
import { makeFields } from "#/build/make-fields.ts";

export function buildSettings(
  settingsType: SettingsType,
): typeof Settings {
  const changeableFields = new Map<string, ORMFieldDef>();
  for (const field of settingsType.fields.values()) {
    if (
      !field.readOnly && !field.hidden
    ) {
      changeableFields.set(field.key, field);
    }
  }
  const settingsClass = class extends Settings<any> {
    override _fields: Map<string, ORMFieldDef> = settingsType.fields;
    override _changeableFields = changeableFields;
    constructor(orm: any) {
      super(orm, settingsType.name);
    }
  };

  makeFields("settings", settingsType, settingsClass);

  return settingsClass;
}
