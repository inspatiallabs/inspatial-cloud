import { ORMFieldDef } from "#/field/field-def-types.ts";
import { raiseORMException } from "#/orm-exception.ts";

export class BaseType<N extends string = string> {
  name: N;
  /**
   * The fields of the settings type.
   */
  fields: Map<string, ORMFieldDef> = new Map();
  displayFields: Map<string, ORMFieldDef> = new Map();
  constructor(
    name: N,
    config: {
      fields: Array<ORMFieldDef>;
      label?: string;
    },
  ) {
    this.name = this.#sanitizeName(name);
    const label: string = config.label || name;
    for (const field of config.fields) {
      if (this.fields.has(field.key)) {
        raiseORMException(
          `Field with key ${field.key} already exists in EntryType ${this.name}`,
        );
      }
      this.fields.set(field.key, field);
    }

    this.#setDisplayFields();
  }

  #sanitizeName<N>(name: string): N {
    return name as N;
  }
  #setDisplayFields(): void {
    for (const field of this.fields.values()) {
      if (field.hidden) {
        continue;
      }
      if (["id", "createdAt", "updatedAt"].includes(field.key)) {
        continue;
      }
      this.displayFields.set(field.key, field);
    }
  }
}
