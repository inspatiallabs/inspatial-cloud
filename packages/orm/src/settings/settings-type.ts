import { ORMFieldDef } from "#/field/field-def-types.ts";
import { convertString } from "@inspatial/serve/utils";
import { raiseORMException } from "#/orm-exception.ts";
import { BaseType } from "#/shared/base-type-class.ts";
import { SettingsTypeConfig, SettingsTypeInfo } from "#/settings/types.ts";

/**
 * Defines a settings type for the ORM.
 */
export class SettingsType<N extends string = string> extends BaseType<N> {
  /**
   * Defines a settings type for the ORM.
   * @param name The name of the settings type.
   * @param fields The fields of the settings type.
   */
  config: SettingsTypeConfig;
  constructor(
    name: N,
    config: {
      fields: Array<ORMFieldDef>;
      label?: string;
      description?: string;
    },
  ) {
    super(name, config);
    this.config = {
      description: "",
      label: config.label || name,
    };
  }

  get info(): SettingsTypeInfo {
    return {
      name: this.name,
      label: this.config.label,
      config: this.config,
      fields: Array.from(this.fields.values()),
      titleFields: Array.from(this.connectionTitleFields.values()),
      displayFields: Array.from(this.displayFields.values()),
    };
  }
}
