import type { ORMFieldDef } from "#/field/field-def-types.ts";

export interface BaseTypeInfo {
  name: string;
  extension?: string;
  label: string;
  fields: Array<ORMFieldDef>;
  titleFields: Array<ORMFieldDef>;

  displayFields: Array<ORMFieldDef>;
}

export interface BaseTypeConfig {
  label: string;
  description: string;
  extension?: {
    extensionType: {
      key: string;
      title: string;
    };
    key: string;
    title: string;
    description: string;
    version: string;
  };
}
