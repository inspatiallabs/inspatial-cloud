import { IDMode, ORMFieldDef } from "#/field/types.ts";
import { raiseORMException } from "#/orm-exception.ts";
import { convertString } from "@inspatial/serve/utils";

export class EntryType<
  N extends string = string,
  S extends string = string,
  F extends Array<ORMFieldDef<S>> = Array<ORMFieldDef<S>>,
> {
  name: N;
  config: {
    tableName: string;
    label: string;
    description: string;
    idMode: IDMode;
  };
  defaultListFields: Set<string> = new Set(["id", "createdAt", "updatedAt"]);
  fields: Map<string, ORMFieldDef> = new Map();
  constructor(name: N, config: {
    description?: string;
    label?: string;
    idMode?: IDMode;
    defaultListFields?: Array<F[number]["key"]>;
    fields: F;
  }) {
    this.fields.set("id", {
      key: "id",
      type: "IDField",
      idMode: config.idMode || "auto",
      label: "ID",
      readOnly: true,
      required: true,
    });
    this.fields.set("createdAt", {
      key: "createdAt",
      label: "Created At",
      type: "TimeStampField",
      readOnly: true,
      description: "The date and time this entry was created",
      required: true,
    });
    this.fields.set("updatedAt", {
      key: "updatedAt",
      label: "Updated At",
      type: "TimeStampField",
      readOnly: true,
      description: "The date and time this entry was last updated",
      required: true,
    });
    this.name = this.#sanitizeName(name);
    const label: string = config.label || convertString(name, "title", true);
    this.config = {
      tableName: this.#generateTableName(),
      label,
      idMode: config.idMode || "ulid",
      description: config.description ||
        `${label} entry type for InSpatial ORM`,
    };
    for (const field of config.fields) {
      if (this.fields.has(field.key)) {
        raiseORMException(
          `Field with key ${field.key} already exists in EntryType ${this.name}`,
        );
      }
      this.fields.set(field.key, field);
    }
    if (config.defaultListFields) {
      for (const fieldKey of config.defaultListFields) {
        if (!this.fields.has(fieldKey)) {
          raiseORMException(
            `Field with key ${fieldKey} does not exist in EntryType ${this.name}`,
          );
        }
        this.defaultListFields.add(fieldKey);
      }
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
    convertString;
    const snakeName = convertString(this.name, "snake", true);
    return `entry_${snakeName}`;
  }
  #sanitizeName<N>(name: string): N {
    return name as N;
  }
}
