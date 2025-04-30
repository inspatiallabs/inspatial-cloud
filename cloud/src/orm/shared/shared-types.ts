import type { ORMFieldDef } from "#/orm/field/field-def-types.ts";
import type {
  ChildEntryType,
  ChildEntryTypeInfo,
} from "#/orm/child-entry/child-entry.ts";

export interface BaseTypeInfo {
  name: string;
  description: string;
  extension?: string;
  label: string;
  fields: Array<ORMFieldDef>;
  titleFields: Array<ORMFieldDef>;
  children?: Array<ChildEntryTypeInfo>;
  displayFields: Array<ORMFieldDef>;
}

export interface BaseTypeConfig {
  label: string;
  description: string;
  extension?: {
    extensionType: {
      key: string;
      label: string;
    };
    key: string;
    label: string;
    description: string;
    version?: string;
  };
}

export interface BaseConfig {
  label?: string;
  description?: string;
  fields: Array<ORMFieldDef>;
  children?: Array<ChildEntryType<any>>;
}
