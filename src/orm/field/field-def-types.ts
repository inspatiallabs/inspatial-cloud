import type { Choice, IDMode, InValue } from "~/orm/field/types.ts";
import type {
  FileTypes,
  ImageFileType,
} from "~/files/mime-types/file-types.ts";

export type InField<T extends InFieldType = InFieldType> = InFieldMap[T];

export type InFieldMap = {
  DataField: DataField;
  TextField: TextField;
  IntField: IntField;
  BigIntField: BigIntField;
  DecimalField: DecimalField;
  DateField: DateField;
  TimeStampField: TimeStampField;
  BooleanField: BooleanField;
  PasswordField: PasswordField;
  ChoicesField: ChoicesField;
  MultiChoiceField: MultiChoiceField;
  EmailField: EmailField;
  ImageField: ImageField;
  JSONField: JSONField;
  PhoneField: PhoneField;
  ConnectionField: ConnectionField;
  RichTextField: RichTextField;
  URLField: URLField;
  ListField: ListField;
  CurrencyField: CurrencyField;
  IDField: IDField;
  FileField: FileField;
  TimeField: TimeField;
};

export type InFieldType = keyof InFieldMap;

/**
 * Fetch the value from another entry, based on the id in a `ConnectionField` in this entry.
 */
export interface FetchOptions {
  /**
   * The `ConnectionField` in this entry that contains the ID of the entry to fetch.
   */
  connectionField: string;
  /**
   * The field in the fetched entry to get the value from.
   */
  fetchField: string;
}
type DependsOn<FK extends PropertyKey = PropertyKey> =
  | FK
  | {
    field: FK;
    value: InValue | Array<InValue>;
  }
  | Array<{
    field: FK;
    value: InValue | Array<InValue>;
  }>;
type BaseField<FK extends PropertyKey = PropertyKey> = {
  key: string;
  label?: string;
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

  dependsOn?: DependsOn<FK>;
};
export interface IDField extends BaseField {
  type: "IDField";
  idMode: IDMode;
}

export interface DataField extends BaseField {
  /**
   * `DataField` is a string of up to a maximum of 255 characters.
   */
  type: "DataField";
  defaultValue?: InValue<"DataField">;
}

export interface TextField extends BaseField {
  /**
   * `TextField` is a string of up to a maximum of 65535 characters.
   */
  type: "TextField";
  defaultValue?: InValue<"TextField">;
}

export type IntFormat = "number" | "fileSize" | "withCommas" | "percent";
export interface IntField extends BaseField {
  /**
   * `IntField` is a whole number.
   */
  type: "IntField";
  min?: number;
  max?: number;
  format?: IntFormat;
  defaultValue?: InValue<"IntField">;
}

export interface BigIntField extends BaseField {
  type: "BigIntField";
  min?: bigint;
  max?: bigint;
  defaultValue?: InValue<"BigIntField">;
}

export interface DecimalField extends BaseField {
  type: "DecimalField";
  min?: number;
  max?: number;
  defaultValue?: InValue<"DecimalField">;
}

export interface DateField extends BaseField {
  type: "DateField";
  defaultValue?: InValue<"DateField">;
}

export interface TimeStampField extends BaseField {
  type: "TimeStampField";
  defaultValue?: InValue<"TimeStampField">;
  showTime?: boolean;
}

export interface TimeField extends BaseField {
  type: "TimeField";
  defaultValue?: InValue<"TimeField">;
}

export interface BooleanField extends BaseField {
  type: "BooleanField";
  defaultValue?: InValue<"BooleanField">;
}

export interface PasswordField extends BaseField {
  type: "PasswordField";
  defaultValue?: InValue<"PasswordField">;
}

export interface ChoicesField extends BaseField {
  type: "ChoicesField";
  choices: Array<Choice>;
  defaultValue?: InValue<"ChoicesField">;
}

export interface MultiChoiceField extends BaseField {
  type: "MultiChoiceField";
  choices: string[];
  defaultValue?: InValue<"MultiChoiceField">;
}

export interface EmailField extends BaseField {
  type: "EmailField";
  defaultValue?: InValue<"EmailField">;
}

export interface ImageField extends BaseField {
  type: "ImageField";
  defaultValue?: InValue<"ImageField">;
  allowedImageTypes: Array<ImageFileType> | "all";
  entryType?: "cloudFile" | "globalCloudFile";
  connectionIdMode?: "ulid";
}

export interface FileField extends BaseField {
  type: "FileField";
  defaultValue?: InValue<"FileField">;
  allowedFileTypes: Partial<FileTypes> | Array<keyof FileTypes> | "all";
  entryType?: "cloudFile";
  connectionIdMode?: "ulid";
}

export interface JSONField extends BaseField {
  type: "JSONField";
  defaultValue?: InValue<"JSONField">;
}

export interface PhoneField extends BaseField {
  type: "PhoneField";
  defaultValue?: InValue<"PhoneField">;
}

export interface ConnectionField extends BaseField {
  type: "ConnectionField";
  /**
   * The `EntryType` that this field connects to.
   */
  entryType: string;

  connectionIdMode?: IDMode;
}

export interface RichTextField extends BaseField {
  type: "RichTextField";
  defaultValue?: InValue<"RichTextField">;
}

export interface URLField extends BaseField {
  type: "URLField";
  defaultValue?: InValue<"URLField">;
  urlType?: "button" | "link" | "text";
}

export interface ListField extends BaseField {
  type: "ListField";
  defaultValue?: InValue<"ListField">;
}

export interface CurrencyField extends BaseField {
  type: "CurrencyField";
  defaultValue?: InValue<"CurrencyField">;
  currencyCode?: CurrencyCode;
  currency?: Currency;
}
export type CurrencyCode = keyof typeof Currencies;
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  symbolPosition?: "left" | "right";
  decimalSeparator?: string;
  thousandsSeparator?: string;
  decimalPlaces?: number;
}

export const Currencies = {
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    symbolPosition: "left",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    decimalPlaces: 2,
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    symbolPosition: "right",
    decimalSeparator: ",",
    thousandsSeparator: ".",
    decimalPlaces: 2,
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    symbolPosition: "left",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    decimalPlaces: 2,
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    symbolPosition: "left",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    decimalPlaces: 0,
  },
  AUD: {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    symbolPosition: "left",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    decimalPlaces: 2,
  },
  CAD: {
    code: "CAD",
    symbol: "C$",
    name: "Canadian Dollar",
    symbolPosition: "left",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    decimalPlaces: 2,
  },
  ILS: {
    code: "ILS",
    symbol: "₪",
    name: "Israeli New Shekel",
    symbolPosition: "left",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    decimalPlaces: 2,
  },
  // Add more currencies as needed
} as const satisfies Record<string, Currency>;
