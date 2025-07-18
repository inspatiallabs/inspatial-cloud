import type { SettingsType } from "~/orm/settings/settings-type.ts";
import type { EntryType } from "~/orm/entry/entry-type.ts";
import type { Entry } from "~/orm/entry/entry.ts";
import type { Settings } from "~/orm/settings/settings.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";
import type {
  ChildEntry,
  ChildEntryType,
} from "~/orm/child-entry/child-entry.ts";

interface ForTypeMap {
  entry: EntryType;
  settings: SettingsType;
  child: ChildEntryType;
}

interface ForTypeMapWithData {
  entry: typeof Entry<any>;
  settings: typeof Settings<any>;
  child: typeof ChildEntry<any>;
}
export function makeFields<ForType extends keyof ForTypeMap>(
  forType: ForType,
  typeClass: ForTypeMap[ForType],
  dataClass: ForTypeMapWithData[ForType],
): void {
  const fields = typeClass.fields;
  const children = typeClass.children || [];
  for (const childName of children.keys()) {
    Object.defineProperty(dataClass.prototype, childName, {
      get(): any {
        return (this as Entry | Settings).getChild(childName as string);
      },
      enumerable: true,
    });
  }
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
        const instance = this as Entry | Settings | ChildEntry;
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
