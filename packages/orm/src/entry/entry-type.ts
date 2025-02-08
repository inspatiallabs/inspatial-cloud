import { camelToSnakeCase } from "../../../serve/src/utils/string-utils.ts";
import { ORMFieldDef } from "#/field/types.ts";

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
  }
  #generateTableName(): string {
    const snakeName = camelToSnakeCase(this.name);
    return `entry_${snakeName}`;
  }
  #sanitizeName<N>(name: string): N {
    return name as N;
  }
}

const entryType = new EntryType("user", {
  fields: [{
    key: "name",
    label: "Name",
    type: "DataField",
  }, {
    key: "age",
    label: "Age",
    type: "IntField",
    min: 0,
    max: 120,
  }],
});
