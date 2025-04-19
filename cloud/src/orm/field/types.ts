export interface Choice {
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
