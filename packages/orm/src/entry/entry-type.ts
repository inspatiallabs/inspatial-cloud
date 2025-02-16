import { camelToSnakeCase } from "../../../serve/src/utils/string-utils.ts";
import { ORMFieldDef } from "#/field/types.ts";
import { raiseORMException } from "#/orm-exception.ts";

export class EntryType<N extends string = string> {
  name: N;
  config: {
    tableName: string;
  };
  fields: Map<string, ORMFieldDef> = new Map();
  constructor(name: N, config: {
    fields: Array<ORMFieldDef>;
  }) {
    this.name = this.#sanitizeName(name);

    this.config = {
      tableName: this.#generateTableName(),
    };
    for (const field of config.fields) {
      if (this.fields.has(field.key)) {
        raiseORMException(
          `Field with key ${field.key} already exists in EntryType ${this.name}`,
        );
      }
      this.fields.set(field.key, field);
    }
  }

  get info() {
    return {
      name: this.name,
      config: this.config,
      fields: Array.from(this.fields.values()),
    };
  }
  #generateTableName(): string {
    const snakeName = camelToSnakeCase(this.name);
    return `entry_${snakeName}`;
  }
  #sanitizeName<N>(name: string): N {
    return name as N;
  }
}
