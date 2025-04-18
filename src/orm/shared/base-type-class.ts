import type { ORMFieldDef } from "#/orm/field/field-def-types.ts";
import { raiseORMException } from "#/orm/orm-exception.ts";
import convertString from "#/utils/convert-string.ts";

export class BaseType<N extends string = string> {
  name: N;
  label: string;

  description: string;
  /**
   * The fields of the settings type.
   */
  fields: Map<string, ORMFieldDef> = new Map();
  displayFields: Map<string, ORMFieldDef> = new Map();
  connectionTitleFields: Map<string, ORMFieldDef> = new Map();
  constructor(
    name: N,
    config: {
      fields: Array<ORMFieldDef>;
      label?: string;
      description?: string;
    },
  ) {
    this.name = this.#sanitizeName(name);

    let label: string | undefined = config.label;
    if (!label) {
      label = convertString(this.name, "title", true);
    }
    this.label = label;
    this.description = config.description || "";
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
