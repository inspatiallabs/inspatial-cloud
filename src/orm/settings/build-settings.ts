import type { SettingsType } from "~/orm/settings/settings-type.ts";
import { Settings } from "~/orm/settings/settings.ts";
import type { InField } from "~/orm/field/field-def-types.ts";
import { makeFields } from "~/orm/build/make-fields.ts";
import type { SettingsActionDefinition } from "~/orm/settings/types.ts";
import { buildChildren } from "~/orm/child-entry/build-children.ts";
import type { InCloud } from "~/in-cloud.ts";
import type { UserID } from "~/auth/types.ts";

export function buildSettings(
  settingsType: SettingsType,
): typeof Settings<any> {
  const changeableFields = new Map<string, InField>();
  const fieldIds = new Map<string, string>();
  for (const field of settingsType.fields.values()) {
    fieldIds.set(field.key, `${settingsType.name}:${field.key}`);
    if (
      !field.readOnly && !field.hidden
    ) {
      changeableFields.set(field.key, field);
    }
  }
  const childrenClasses = buildChildren(settingsType);
  const settingsClass = class extends Settings<any> {
    override _systemGlobal: boolean = settingsType.systemGlobal;
    override _fields: Map<string, InField> = settingsType.fields;
    override _changeableFields = changeableFields;
    override _fieldIds: Map<string, string> = fieldIds;
    override _actions: Map<string, SettingsActionDefinition> =
      settingsType.actions;
    override readonly _settingsType = settingsType;
    override _childrenClasses = childrenClasses;
    constructor(config: { orm: any; inCloud: InCloud; user: UserID }) {
      super({
        orm: config.orm,
        inCloud: config.inCloud,
        name: settingsType.name,
        user: config.user,
        systemGlobal: settingsType.systemGlobal,
      });
      this._setupChildren();
    }
  };

  makeFields("settings", settingsType, settingsClass);
  return settingsClass;
}
