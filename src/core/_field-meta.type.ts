import type { ChildList, EntryBase as Base } from "@inspatial/cloud/types";

type FieldMetaFields = {
  /**
   * **Entry Meta** (ConnectionField)
   *
   * **EntryType** `entryMeta`
   * @type {string}
   * @required true
   */
  entryMeta: string;
  /**
   * **Key** (DataField)
   * @type {string}
   * @required true
   */
  key: string;
  /**
   * **Label** (DataField)
   * @type {string}
   * @required true
   */
  label: string;
  /**
   * **Type** (ChoicesField)
   * @type {'BigIntField' | 'BooleanField' | 'ChoicesField' | 'ConnectionField' | 'CurrencyField' | 'DataField' | 'DateField' | 'DecimalField' | 'EmailField' | 'ImageField' | 'IntField' | 'JSONField' | 'ListField' | 'MultiChoiceField' | 'PasswordField' | 'PhoneField' | 'RichTextField' | 'TextField' | 'TimeStampField' | 'URLField' | 'IDField' | 'FileField' | 'TimeField' | 'CodeField' | 'ArrayField'}
   * @required true
   */
  type:
    | "BigIntField"
    | "BooleanField"
    | "ChoicesField"
    | "ConnectionField"
    | "CurrencyField"
    | "DataField"
    | "DateField"
    | "DecimalField"
    | "EmailField"
    | "ImageField"
    | "IntField"
    | "JSONField"
    | "ListField"
    | "MultiChoiceField"
    | "PasswordField"
    | "PhoneField"
    | "RichTextField"
    | "TextField"
    | "TimeStampField"
    | "URLField"
    | "IDField"
    | "FileField"
    | "TimeField"
    | "CodeField"
    | "ArrayField";
  /**
   * **Description** (TextField)
   * @description A brief description of the field.
   * @type {string}
   */
  description?: string;
  /**
   * **Required** (BooleanField)
   * @description Whether the field is mandatory.
   * @type {boolean}
   */
  required: boolean;
  /**
   * **Read Only** (BooleanField)
   * @description Whether the field is read-only.
   * @type {boolean}
   */
  readOnly: boolean;
  /**
   * **Unique** (BooleanField)
   * @description Whether the field must have unique values across entries.
   * @type {boolean}
   */
  unique: boolean;
  /**
   * **Default Value** (DataField)
   * @description The default value for the field.
   * @type {string}
   */
  defaultValue?: string;
  /**
   * **Hidden** (BooleanField)
   * @description Whether the field is hidden in the UI.
   * @type {boolean}
   */
  hidden: boolean;
  /**
   * **Placeholder** (DataField)
   * @description Placeholder text for the field.
   * @type {string}
   */
  placeholder?: string;
  /**
   * **Entry Type** (ConnectionField)
   *
   * **EntryType** `entryMeta`
   * @description The entry type this connection field is associated with.
   * @type {string}
   */
  entryType?: string;
  /**
   * **Field Meta** (IDField)
   * @type {string}
   * @required true
   */
  id: string;
  /**
   * **Created At** (TimeStampField)
   * @description The date and time this entry was created
   * @type {number}
   * @required true
   */
  createdAt: number;
  /**
   * **Updated At** (TimeStampField)
   * @description The date and time this entry was last updated
   * @type {number}
   * @required true
   */
  updatedAt: number;
  /**
   * **Tags** (ArrayField)
   * @description Tags associated with this Field Meta
   * @type {Array<any>}
   */
  in__tags?: Array<any>;
  /**
   * **Entry Meta Title** (DataField)
   * @type {string}
   */
  entryMeta__title?: string;
  /**
   * **Entry Type Title** (DataField)
   * @type {string}
   */
  entryType__title?: string;
};
export type FieldMeta = Base<FieldMetaFields> & {
  _name: "fieldMeta";
  __fields__: FieldMetaFields;
  /**
   * **Entry Meta** (ConnectionField)
   *
   * **EntryType** `entryMeta`
   * @type {string}
   * @required true
   */
  $entryMeta: string;
  /**
   * **Key** (DataField)
   * @type {string}
   * @required true
   */
  $key: string;
  /**
   * **Label** (DataField)
   * @type {string}
   * @required true
   */
  $label: string;
  /**
   * **Type** (ChoicesField)
   * @type {'BigIntField' | 'BooleanField' | 'ChoicesField' | 'ConnectionField' | 'CurrencyField' | 'DataField' | 'DateField' | 'DecimalField' | 'EmailField' | 'ImageField' | 'IntField' | 'JSONField' | 'ListField' | 'MultiChoiceField' | 'PasswordField' | 'PhoneField' | 'RichTextField' | 'TextField' | 'TimeStampField' | 'URLField' | 'IDField' | 'FileField' | 'TimeField' | 'CodeField' | 'ArrayField'}
   * @required true
   */
  $type:
    | "BigIntField"
    | "BooleanField"
    | "ChoicesField"
    | "ConnectionField"
    | "CurrencyField"
    | "DataField"
    | "DateField"
    | "DecimalField"
    | "EmailField"
    | "ImageField"
    | "IntField"
    | "JSONField"
    | "ListField"
    | "MultiChoiceField"
    | "PasswordField"
    | "PhoneField"
    | "RichTextField"
    | "TextField"
    | "TimeStampField"
    | "URLField"
    | "IDField"
    | "FileField"
    | "TimeField"
    | "CodeField"
    | "ArrayField";
  /**
   * **Description** (TextField)
   * @description A brief description of the field.
   * @type {string}
   */
  $description?: string;
  /**
   * **Required** (BooleanField)
   * @description Whether the field is mandatory.
   * @type {boolean}
   */
  $required: boolean;
  /**
   * **Read Only** (BooleanField)
   * @description Whether the field is read-only.
   * @type {boolean}
   */
  $readOnly: boolean;
  /**
   * **Unique** (BooleanField)
   * @description Whether the field must have unique values across entries.
   * @type {boolean}
   */
  $unique: boolean;
  /**
   * **Default Value** (DataField)
   * @description The default value for the field.
   * @type {string}
   */
  $defaultValue?: string;
  /**
   * **Hidden** (BooleanField)
   * @description Whether the field is hidden in the UI.
   * @type {boolean}
   */
  $hidden: boolean;
  /**
   * **Placeholder** (DataField)
   * @description Placeholder text for the field.
   * @type {string}
   */
  $placeholder?: string;
  /**
   * **Entry Type** (ConnectionField)
   *
   * **EntryType** `entryMeta`
   * @description The entry type this connection field is associated with.
   * @type {string}
   */
  $entryType?: string;
  /**
   * **Field Meta** (IDField)
   * @type {string}
   * @required true
   */
  $id: string;
  /**
   * **Created At** (TimeStampField)
   * @description The date and time this entry was created
   * @type {number}
   * @required true
   */
  $createdAt: number;
  /**
   * **Updated At** (TimeStampField)
   * @description The date and time this entry was last updated
   * @type {number}
   * @required true
   */
  $updatedAt: number;
  /**
   * **Tags** (ArrayField)
   * @description Tags associated with this Field Meta
   * @type {Array<any>}
   */
  $in__tags?: Array<any>;
  /**
   * **Entry Meta Title** (DataField)
   * @type {string}
   */
  $entryMeta__title?: string;
  /**
   * **Entry Type Title** (DataField)
   * @type {string}
   */
  $entryType__title?: string;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof FieldMeta as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
};
