import type { InField } from "~/orm/field/field-def-types.ts";
import type {
  ChildEntryType,
  ChildEntryTypeInfo,
} from "~/orm/child-entry/child-entry.ts";

export interface BaseTypeInfo {
  name: string;
  description: string;
  systemGlobal: boolean;
  extension?: string;
  label: string;
  fields: Array<InField>;
  titleFields: Array<InField>;
  children?: Array<ChildEntryTypeInfo>;
  displayFields: Array<InField>;
  fieldGroups: Array<FieldGroup>;
}

export interface BaseTypeConfig {
  label: string;
  description?: string | null;
  extension?: {
    extensionType: {
      key: string;
      label: string;
    };
    key: string;
    label: string;
    description?: string | null;
    version?: string;
  };
}

export interface BaseConfig<FK extends PropertyKey = PropertyKey> {
  /** A human readable label. If not provided, one will be generated from the name. */
  label?: string;
  /** A brief description of this type. */
  description?: string;
  /** Setting this to `true` will add this to the globally available schema that all accounts can reference. */
  systemGlobal?: boolean;
  /** An array of `InField` definitions  */
  fields: Array<InField>;
  fieldGroups?: Array<FieldGroupConfig<FK>>;
  children?: Array<ChildEntryType<any>>;
  dir?: string;
}

export interface FieldGroupConfig<FK extends PropertyKey = PropertyKey> {
  key: string;
  label?: string;
  description?: string;
  fields: Array<FK>;
}

export interface FieldGroup {
  key: string;
  label: string;
  description?: string;
  fields: Array<InField>;
  displayFields: Array<InField>;
}
