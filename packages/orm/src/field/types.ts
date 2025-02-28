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

interface BaseFieldDef {
  key: string;
  label: string;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  unique?: boolean;
  defaultValue?: any;
  hidden?: boolean;
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
  defaultValue?: ORMFieldMap["ConnectionField"];
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

interface Choice {
  key: string;
  label: string;
}
export type ORMFieldType = keyof ORMFieldMap;
export type ORMFieldMap = {
  /**
   * The ID field type.
   */
  IDField: string;

  /**
   * The data field type. This is a short text data field that is limited to 255 characters.
   */
  DataField: string;

  /**
   * The integer field type. This is a field that stores an integer.
   */
  IntField: number;

  /**
   * The big integer field type. This is a field that stores a big integer.
   */
  BigIntField: bigint;

  /**
   * The decimal field type. This is a field that stores a decimal number.
   */
  DecimalField: number;

  /**
   * The date field type. This is a field that stores a date without a time.
   * 'YYYY-MM-DD'
   */
  DateField: string;

  /**
   * The timestamp field type. This is a field that stores a date and time.
   * it's a number that represents the number of milliseconds since the Unix epoch.
   *
   * **Note**: This is a number, not a Date object.
   *
   * `new Date(timestampField)` will convert the number to a Date object.
   */
  TimeStampField: number;

  /**
   * The boolean field type. This is a field that stores a boolean value
   * `true` or `false`.
   */
  BooleanField: boolean;

  /**
   * The password field type. This is a field that stores a password.
   * It's main difference from the DataField is in how it's shown in the UI.
   */
  PasswordField: string;

  /**
   * The Choices field type. This is a field that stores a single choice.
   * The choices are defined in the `choices` property of the field definition.
   * The value of the field is the key of the selected choice.
   */
  ChoicesField: string | number;

  /**
   * The MultiChoice field type. This is a field that stores multiple choices.
   * The choices are defined in the `choices` property of the field definition.
   * The value of the field is an array of the keys of the selected choices.
   */
  MultiChoiceField: string[];

  /**
   * The text field type. This is a long text data field.
   */
  TextField: string;

  /**
   * The email field type. This is a field that stores an email address.
   * The value is validated to be a valid email address format.
   */
  EmailField: string;

  /**
   * This is not implemented yet!
   */
  ImageField: string;

  /**
   * The JSON field type. This is a field that stores a JSON object.
   */
  JSONField: Record<string, any>;

  /**
   * The phone field type. This is a field that stores a phone number.
   * The value is validated to be a valid phone number format.
   */
  PhoneField: string;

  /**
   * This is a connection field type.
   * This is a field that references an entry from another entry type,
   */
  ConnectionField: {
    id: string;
    display: string;
  };

  /**
   * Not implemented yet!
   */
  RichTextField: Record<string, any>;

  /**
   * The URL field type. This is a field that stores a URL.
   * The value is validated to be a valid URL format.
   */
  URLField: string;

  /**
   * The tag field type. This is a field that stores a list of words or phrases.
   *
   * **Example**: `["tag1", "tag2", "tag3"]`
   */
  ListField: string[];

  CurrencyField: number;
};

export type IDMode = "uuid" | "ulid" | "auto";
