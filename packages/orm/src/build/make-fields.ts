import type { SettingsType } from "#/settings/settings-type.ts";
import type { EntryType } from "#/entry/entry-type.ts";
import type { Entry } from "#/entry/entry.ts";
import type { Settings } from "#/settings/settings.ts";
import { raiseORMException } from "#/orm-exception.ts";

export function makeFields(
  forType: "entry" | "settings",
  typeClass: EntryType | SettingsType,
  dataClass: typeof Entry | typeof Settings,
): void {
  const fields = typeClass.fields;
  for (const field of fields.values()) {
    Object.defineProperty(dataClass.prototype, field.key, {
      enumerable: true,
      get(): any {
        if (!(this as Entry | Settings)._data.has(field.key)) {
          (this as Entry | Settings)._data.set(field.key, null);
        }
        return (this as Entry)._data.get(field.key);
      },
      set(value): void {
        const instance = this as Entry | Settings;
        const fieldType = instance._getFieldType(field.type);
        const fieldDef = instance._getFieldDef(field.key);
        value = fieldType.normalize(value, fieldDef);
        const existingValue = instance._data.get(field.key);
        if (existingValue === value) {
          return;
        }
        instance._modifiedValues.set(field.key, {
          from: existingValue,
          to: value,
        });
        const isValid = fieldType.validate(value, fieldDef);
        if (!isValid) {
          raiseORMException(
            `${value} is not a valid value for field ${field.key} in ${forType} ${instance._name}`,
          );
        }
        instance._data.set(field.key, value);
      },
    });
  }
}
