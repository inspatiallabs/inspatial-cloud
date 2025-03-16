import { Choice, IDMode, ORMFieldMap } from "#/field/types.ts";

/**
 * These are the  types for defining fields in an entry.
 */

export type ORMFieldDef =
  & BaseFieldDef
  & (
    | DataFieldDef
    | TextFieldDef
    | IntFieldDef
    | BigIntFieldDef
    | DecimalFieldDef
    | DateFieldDef
    | TimeStampFieldDef
    | BooleanFieldDef
    | PasswordFieldDef
    | ChoicesFieldDef
    | MultiChoiceFieldDef
    | EmailFieldDef
    | ImageFieldDef
    | JSONFieldDef
    | PhoneFieldDef
    | ConnectionFieldDef
    | RichTextFieldDef
    | URLFieldDef
    | ListFieldDef
    | CurrencyFieldDef
    | IDFieldDef
  );

export type FieldDefMap = {
  DataField: DataFieldDef;
  TextField: TextFieldDef;
  IntField: IntFieldDef;
  BigIntField: BigIntFieldDef;
  DecimalField: DecimalFieldDef;
  DateField: DateFieldDef;
  TimeStampField: TimeStampFieldDef;
  BooleanField: BooleanFieldDef;
  PasswordField: PasswordFieldDef;
  ChoicesField: ChoicesFieldDef;
  MultiChoiceField: MultiChoiceFieldDef;
  EmailField: EmailFieldDef;
  ImageField: ImageFieldDef;
  JSONField: JSONFieldDef;
  PhoneField: PhoneFieldDef;
  ConnectionField: ConnectionFieldDef;
  RichTextField: RichTextFieldDef;
  URLField: URLFieldDef;
  ListField: ListFieldDef;
  CurrencyField: CurrencyFieldDef;
  IDField: IDFieldDef;
};

export type FieldDefType = keyof FieldDefMap;

/**
 * Fetch the value from another entry, based on the id in a `ConnectionField` in this entry.
 */
interface FetchOptions {
  /**
   * The `ConnectionField` in this entry that contains the ID of the entry to fetch.
   */
  connectionField: string;
  /**
   * The field in the fetched entry to get the value from.
   */
  fetchField: string;
}
interface BaseFieldDef {
  key: string;
  label: string;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  unique?: boolean;
  defaultValue?: any;
  hidden?: boolean;
  /**
   * Fetch the value from another entry, based on the id in a `ConnectionField` in this entry.
   */
  fetchField?: FetchOptions;
}
interface IDFieldDef extends BaseFieldDef {
  type: "IDField";
  idMode: IDMode;
}

interface DataFieldDef extends BaseFieldDef {
  /**
   * `DataField` is a string of up to a maximum of 255 characters.
   */
  type: "DataField";
  defaultValue?: ORMFieldMap["DataField"];
}

interface TextFieldDef extends BaseFieldDef {
  /**
   * `TextField` is a string of up to a maximum of 65535 characters.
   */
  type: "TextField";
  defaultValue?: ORMFieldMap["TextField"];
}

interface IntFieldDef extends BaseFieldDef {
  /**
   * `IntField` is a whole number.
   */
  type: "IntField";
  min?: number;
  max?: number;
  defaultValue?: ORMFieldMap["IntField"];
}

interface BigIntFieldDef extends BaseFieldDef {
  type: "BigIntField";
  min?: bigint;
  max?: bigint;
  defaultValue?: ORMFieldMap["BigIntField"];
}

interface DecimalFieldDef extends BaseFieldDef {
  type: "DecimalField";
  min?: number;
  max?: number;
  defaultValue?: ORMFieldMap["DecimalField"];
}

interface DateFieldDef extends BaseFieldDef {
  type: "DateField";
  defaultValue?: ORMFieldMap["DateField"];
}

interface TimeStampFieldDef extends BaseFieldDef {
  type: "TimeStampField";
  defaultValue?: ORMFieldMap["TimeStampField"];
}

interface BooleanFieldDef extends BaseFieldDef {
  type: "BooleanField";
  defaultValue?: ORMFieldMap["BooleanField"];
}

interface PasswordFieldDef extends BaseFieldDef {
  type: "PasswordField";
  defaultValue?: ORMFieldMap["PasswordField"];
}

interface ChoicesFieldDef extends BaseFieldDef {
  type: "ChoicesField";
  choices: Array<Choice>;
  defaultValue?: ORMFieldMap["ChoicesField"];
}

interface MultiChoiceFieldDef extends BaseFieldDef {
  type: "MultiChoiceField";
  choices: string[];
  defaultValue?: ORMFieldMap["MultiChoiceField"];
}

interface EmailFieldDef extends BaseFieldDef {
  type: "EmailField";
  defaultValue?: ORMFieldMap["EmailField"];
}

interface ImageFieldDef extends BaseFieldDef {
  type: "ImageField";
  defaultValue?: ORMFieldMap["ImageField"];
}

interface JSONFieldDef extends BaseFieldDef {
  type: "JSONField";
  defaultValue?: ORMFieldMap["JSONField"];
}

interface PhoneFieldDef extends BaseFieldDef {
  type: "PhoneField";
  defaultValue?: ORMFieldMap["PhoneField"];
}

interface ConnectionFieldDef extends BaseFieldDef {
  type: "ConnectionField";
  /**
   * The `EntryType` that this field connects to.
   */
  entryType: string;

  connectionIdMode?: IDMode;
}

interface ConnectionField extends ConnectionFieldDef {
}

interface RichTextFieldDef extends BaseFieldDef {
  type: "RichTextField";
  defaultValue?: ORMFieldMap["RichTextField"];
}

interface URLFieldDef extends BaseFieldDef {
  type: "URLField";
  defaultValue?: ORMFieldMap["URLField"];
}

interface ListFieldDef extends BaseFieldDef {
  type: "ListField";
  defaultValue?: ORMFieldMap["ListField"];
}

interface CurrencyFieldDef extends BaseFieldDef {
  type: "CurrencyField";
  defaultValue?: ORMFieldMap["CurrencyField"];
}

export type {
  BaseFieldDef,
  BigIntFieldDef,
  BooleanFieldDef,
  ChoicesFieldDef,
  ConnectionField,
  ConnectionFieldDef,
  CurrencyFieldDef,
  DataFieldDef,
  DateFieldDef,
  DecimalFieldDef,
  EmailFieldDef,
  FetchOptions,
  IDFieldDef,
  ImageFieldDef,
  IntFieldDef,
  JSONFieldDef,
  ListFieldDef,
  MultiChoiceFieldDef,
  PasswordFieldDef,
  PhoneFieldDef,
  RichTextFieldDef,
  TextFieldDef,
  TimeStampFieldDef,
  URLFieldDef,
};
