import { BaseClass } from "~/orm/shared/base-class.ts";
import type { SettingsRow } from "~/orm/settings/types.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";
import type { HookName } from "~/orm/orm-types.ts";

import dateUtils from "~/utils/date-utils.ts";
import type { InField } from "~/orm/field/field-def-types.ts";
import type { InValue } from "~/orm/field/types.ts";
import type { InCloud } from "~/in-cloud.ts";
import { raiseORMException } from "../orm-exception.ts";
import type { UserID } from "../../auth/types.ts";
import { raiseCloudException } from "~/serve/exeption/cloud-exception.ts";
import type { SettingsName } from "#types/models.ts";

export class Settings<S extends SettingsName = SettingsName>
  extends BaseClass<S> {
  _fieldIds!: Map<string, string>;

  #updatedAt: Map<string, number> = new Map();

  static #updatedAtDef: InField<"TimeStampField"> = {
    key: "updatedAt",
    type: "TimeStampField",
    label: "Updated At",
    description: "The time when this settings was last updated",
    readOnly: true,
    required: true,
  };
  readonly _settingsType!: SettingsType<S>;
  constructor(
    config: {
      orm: any;
      inCloud: InCloud;
      user: UserID;
      name?: S;
      systemGlobal?: boolean;
    },
  ) {
    if (!config.name) {
      raiseCloudException("Settings name is required");
    }
    super({
      orm: config.orm,
      inCloud: config.inCloud,
      name: config.name,
      type: "settings",
      user: config.user,
      systemGlobal: config.systemGlobal,
    });
  }
  get clientData(): Record<string, any> {
    this.assertViewPermission();
    const data = this.data;
    for (const fieldName of this._settingsType.hiddenClientFields) {
      delete data[fieldName];
    }
    return data;
  }
  get data(): Record<string, any> {
    this.assertViewPermission();
    const data = Object.fromEntries(this._data.entries());
    const childData: Record<string, any> = {};
    for (const [key, value] of this._childrenData.entries()) {
      childData[key] = value.data;
    }
    return {
      ...data,
      ...childData,
    };
  }

  get updatedAt(): Record<string, InValue<"TimeStampField">> {
    return Object.fromEntries(this.#updatedAt.entries());
  }

  async load(): Promise<void> {
    this.assertViewPermission();
    this._data.clear();
    this._modifiedValues.clear();
    this.#updatedAt.clear();
    const result = await this._db.getRows<SettingsRow>("inSettings", {
      filter: [{
        field: "settingsType",
        op: "=",
        value: this._name,
      }],
      columns: ["field", "value", "updatedAt"],
    });
    for (const row of result.rows) {
      if (!this._fields.has(row.field)) {
        continue;
      }
      const fieldDef = this._getFieldDef(row.field);
      const fieldType = this._getFieldType(fieldDef.type);
      const timestampField = this._getFieldType("TimeStampField");
      const updatedAt = timestampField.parseDbValue(
        row.updatedAt,
        Settings.#updatedAtDef,
      );
      this._data.set(
        row.field,
        fieldType.parseDbValue(row.value.value, fieldDef),
      );
      this.#updatedAt.set(row.field, updatedAt);
    }
    await this.loadChildren(this._name as string);
  }

  async getValue(
    fieldKey: string,
  ): Promise<any> {
    this.assertViewPermission();
    const fieldDef = this._getFieldDef(fieldKey);
    const fieldType = this._getFieldType(fieldDef.type);

    const dbValue = await this._db.getValue(
      "inSettings",
      this.#getFieldId(fieldKey),
      "value",
    );
    return fieldType.parseDbValue(dbValue.value, fieldDef);
  }
  update(data: Record<string, any>): void {
    this.assertModifyPermission();
    for (const [key, value] of Object.entries(data)) {
      if (this._childrenData.has(key)) {
        const childList = this._childrenData.get(key);
        if (childList) {
          childList._parentId = this._name as string;
          childList.update(value);
        }
        continue;
      }
      if (!this._changeableFields.has(key)) {
        continue;
      }
      this[`$${key}` as keyof typeof this] = value;
    }
  }
  async save(): Promise<void> {
    this.assertModifyPermission();
    await this.refreshFetchedFields();
    await this.#beforeValidate();
    await this.#validate();
    await this.#beforeUpdate();
    for (const [key, value] of this._modifiedValues.entries()) {
      const fieldDef = this._getFieldDef(key);
      const fieldType = this._getFieldType(fieldDef.type);
      const dbValue = fieldType.prepareForDB(value.to, fieldDef);
      const timestampField = this._getFieldType("TimeStampField");
      const updatedAt = timestampField.prepareForDB(
        dateUtils.nowTimestamp(),
        Settings.#updatedAtDef,
      );
      await this._db.updateRow("inSettings", this.#getFieldId(key), {
        value: {
          value: dbValue,
          type: fieldDef.type,
        },
        updatedAt,
      }).catch((e) => {
        this.handlePGError(e);
      });
    }

    await this.saveChildren();
    await this.load();
    await this.#afterUpdate();
  }

  #getFieldId(fieldKey: string): string {
    const fieldId = this._fieldIds.get(fieldKey);
    if (!fieldId) {
      throw new Error(
        `Field with key ${fieldKey} does not exist in SettingsType ${this._name}`,
      );
    }
    return fieldId;
  }
  async #runHooks(hookName: HookName): Promise<void> {
    for (const hook of this._settingsType.hooks[hookName]) {
      await hook.handler({
        inCloud: this._inCloud,
        orm: this._orm,
        settings: this as any,
        [this._name]: this as any,
        [this._type]: this as any,
      } as any);
    }
  }

  async #beforeValidate(): Promise<void> {
    await this.#runHooks("beforeValidate");
    await this._orm._runGlobalSettingsHooks("beforeValidate", this);
  }
  async #validate(): Promise<void> {
    await this.#runHooks("validate");
    await this._orm._runGlobalSettingsHooks("validate", this);
  }
  async #beforeUpdate(): Promise<void> {
    await this.#runHooks("beforeUpdate");
    await this._orm._runGlobalSettingsHooks("beforeUpdate", this);
  }
  async #afterUpdate(): Promise<void> {
    await this.#runHooks("afterUpdate");
    await this._orm._runGlobalSettingsHooks("afterUpdate", this);
  }
  get canModify(): boolean {
    return this._settingsType.permission.modify;
  }
  get canView(): boolean {
    return this._settingsType.permission.view;
  }
  assertModifyPermission(): void {
    if (!this.canModify) {
      raiseORMException(
        `You do not have permission to modify ${this._settingsType.config.label}`,
        "PermissionDenied",
        403,
      );
    }
  }
  assertViewPermission(): void {
    if (!this.canView) {
      raiseORMException(
        `You do not have permission to view ${this._settingsType.config.label}`,
        "PermissionDenied",
        403,
      );
    }
  }
}
