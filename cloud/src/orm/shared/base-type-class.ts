import type { ORMFieldDef } from "#/orm/field/field-def-types.ts";
import { raiseORMException } from "#/orm/orm-exception.ts";
import convertString from "#/utils/convert-string.ts";
import type { ChildEntryType } from "#/orm/child-entry/child-entry.ts";
import type { BaseTypeInfo } from "#/orm/shared/shared-types.ts";

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
  children?: Map<string, ChildEntryType<any>>;
  #baseInfo: BaseTypeInfo;
  #info: Record<string, any> = {};
  constructor(
    name: N,
    config: {
      fields: Array<ORMFieldDef>;
      label?: string;
      description?: string;
      children?: Array<ChildEntryType<any>>;
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
    this.#baseInfo = {
      name: this.name,
      label: this.label,
      description: this.description,
      fields: Array.from(this.fields.values()),
      titleFields: Array.from(this.connectionTitleFields.values()),
      displayFields: Array.from(this.displayFields.values()),
    };
    this.#addChildren(config.children);
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
  #addChildren(children?: Array<ChildEntryType<any>>): void {
    if (!children) {
      return;
    }
    this.children = new Map();
    for (const child of children) {
      if (this.children.has(child.name)) {
        raiseORMException(
          `Child with name ${child.name} already exists in EntryType ${this.name}`,
        );
      }
      child.setParentEntryType(this.name);
      child.generateTableName();
      this.children.set(child.name, child);
    }
    this.#baseInfo.children = Array.from(this.children.values()).map(
      (child) => child.info,
    );
  }

  set info(info: Record<string, any>) {
    this.#info = info;
  }

  get info(): BaseTypeInfo {
    return {
      ...this.#baseInfo,
      ...this.#info,
    };
  }
}
