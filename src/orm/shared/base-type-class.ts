import { raiseORMException } from "~/orm/orm-exception.ts";
import convertString from "~/utils/convert-string.ts";
import type { ChildEntryType } from "~/orm/child-entry/child-entry.ts";
import type {
  BaseTypeInfo,
  FieldGroup,
  FieldGroupConfig,
} from "~/orm/shared/shared-types.ts";
import type { InField } from "~/orm/field/field-def-types.ts";

export class BaseType<N extends string = string> {
  name: N;
  label: string;
  extension: string;
  dir?: string;
  systemGlobal: boolean;
  description: string;
  fields: Map<string, InField> = new Map();
  displayFields: Map<string, InField> = new Map();
  fieldGroups: Map<string, FieldGroup> = new Map();
  connectionTitleFields: Map<string, InField> = new Map();
  children?: Map<string, ChildEntryType<any>>;
  #baseInfo: BaseTypeInfo;
  #info: Record<string, any> = {};
  constructor(
    name: N,
    config: {
      fields: Array<InField>;
      fieldGroups?: Array<FieldGroupConfig>;
      systemGlobal?: boolean;
      label?: string;
      description?: string;
      children?: Array<ChildEntryType<any>>;
    },
  ) {
    this.extension = "";
    this.name = this.#sanitizeName(name);
    this.systemGlobal = config.systemGlobal || false;
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
      switch (field.type) {
        case "ImageField":
        case "FileField":
          field.connectionIdMode = "ulid";
          field.entryType = this.systemGlobal ? "globalCloudFile" : "cloudFile";
          break;
      }
      if (!field.label) {
        field.label = convertString(field.key, "title", true);
      }
      this.fields.set(field.key, field);
    }

    this.#setDisplayFields();
    this.#addFieldGroups(config.fieldGroups);
    this.#baseInfo = {
      name: this.name,
      extension: this.extension,
      label: this.label,
      systemGlobal: this.systemGlobal,
      description: this.description,
      fields: Array.from(this.fields.values()),
      titleFields: Array.from(this.connectionTitleFields.values()),
      displayFields: Array.from(this.displayFields.values()),
      fieldGroups: Array.from(this.fieldGroups.values()),
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
      child.config.parentEntryType = this.name;
      child.generateTableName();
      child.systemGlobal = this.systemGlobal;
      this.children.set(child.name, child);
    }
    this.#baseInfo.children = Array.from(this.children.values()).map(
      (child) => child.info,
    );
  }

  #addFieldGroups(fieldGroups?: Array<FieldGroupConfig>): void {
    const allFields = new Set(Array.from(this.fields.keys()));
    for (const group of fieldGroups || []) {
      this.#addFieldGroup(group, allFields);
    }
    if (allFields.size > 0) {
      const defaultGroup: FieldGroupConfig = {
        key: "default",
        label: "",
        fields: Array.from(allFields),
      };
      this.#addFieldGroup(defaultGroup, allFields);
    }
  }
  #addFieldGroup(fieldGroupConfig: FieldGroupConfig, allFields: Set<string>) {
    const fieldGroup: FieldGroup = {
      ...fieldGroupConfig,
      label: fieldGroupConfig.label === undefined
        ? convertString(fieldGroupConfig.key, "title", true)
        : fieldGroupConfig.label,
      fields: [],
      displayFields: [],
    };
    if (this.fieldGroups.has(fieldGroupConfig.key)) {
      raiseORMException(
        `Field group ${fieldGroupConfig.key} already exists in ${this.name}`,
      );
    }
    for (const fieldKey of fieldGroupConfig.fields) {
      const field = this.fields.get(fieldKey as string);
      if (!field) {
        raiseORMException(
          `field ${fieldKey as string} does not exists in ${this.name}`,
        );
      }
      allFields.delete(field.key);
      fieldGroup.fields.push(field);
      const displayField = this.displayFields.get(field.key);
      if (displayField) {
        fieldGroup.displayFields.push(displayField);
      }
    }
    this.fieldGroups.set(fieldGroup.key, fieldGroup);
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
