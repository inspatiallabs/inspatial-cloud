import { BaseClass } from "#/shared/base-class.ts";
import type { SettingsRow } from "#/settings/types.ts";

export class Settings<N extends string = string> extends BaseClass<N> {
  _fieldIds!: Map<string, string>;
  constructor(orm: any, name: N) {
    super(orm, name);
  }
  get data(): Record<string, any> {
    return Object.fromEntries(this._data.entries());
  }

  getFieldId(fieldKey: string): string {
    const fieldId = this._fieldIds.get(fieldKey);
    if (!fieldId) {
      throw new Error(
        `Field with key ${fieldKey} does not exist in SettingsType ${this._name}`,
      );
    }
    return fieldId;
  }
  async load(): Promise<void> {
    this._data.clear();
    this._modifiedValues.clear();
    const result = await this._db.getRows<SettingsRow>("inSettings", {
      filter: {
        settingsType: this._name,
      },
      columns: ["field", "value"],
    });
    for (const row of result.rows) {
      const fieldDef = this._getFieldDef(row.field);
      const fieldType = this._getFieldType(fieldDef.type);
      this._data.set(
        row.field,
        fieldType.parseDbValue(row.value.value, fieldDef),
      );
    }
  }

  async getValue(
    fieldKey: string,
  ): Promise<any> {
    const fieldDef = this._getFieldDef(fieldKey);
    const fieldType = this._getFieldType(fieldDef.type);

    const dbValue = await this._db.getValue(
      "inSettings",
      this.getFieldId(fieldKey),
      "value",
    );
    return fieldType.parseDbValue(dbValue.value.value, fieldDef);
  }
  update(data: Record<string, any>): void {
    for (const [key, value] of Object.entries(data)) {
      if (!this._changeableFields.has(key)) {
        continue;
      }
      this[key as keyof this] = value;
    }
  }
  async save(): Promise<void> {
    for (const [key, value] of this._modifiedValues.entries()) {
      const fieldDef = this._getFieldDef(key);
      const fieldType = this._getFieldType(fieldDef.type);
      const dbValue = fieldType.prepareForDB(value.to, fieldDef);
      const fieldId = `${this._name}:${key}`;
      await this._db.updateRow("inSettings", this.getFieldId(key), {
        value: {
          value: dbValue,
          type: fieldDef.type,
        },
      });
    }
    await this.load();
  }
}
