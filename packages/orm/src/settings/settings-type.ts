import { ORMField } from "#/field/orm-field.ts";

export class SettingsType {
  name: string;
  fields: Array<ORMField>;
  constructor(
    name: string,
    fields: Array<ORMField>,
  ) {
    this.name = name;
    this.fields = fields;
  }
}
