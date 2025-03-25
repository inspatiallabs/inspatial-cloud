import { ORMField } from "#/field/orm-field.ts";

/**
 * Defines a settings type for the ORM.
 */
export class SettingsType {
  /**
   * The name of the settings type.
   */
  name: string;
  /**
   * The fields of the settings type.
   */
  fields: Array<ORMField>;
  /**
   * Defines a settings type for the ORM.
   * @param name The name of the settings type.
   * @param fields The fields of the settings type.
   */
  constructor(
    name: string,
    fields: Array<ORMField>,
  ) {
    this.name = name;
    this.fields = fields;
  }
}
