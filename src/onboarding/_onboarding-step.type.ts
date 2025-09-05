import type { ChildList, EntryBase as Base } from "@inspatial/cloud/types";

type OnboardingStepFields = {
  /**
   * **Title** (DataField)
   * @type {string}
   * @required true
   */
  title: string;
  /**
   * **Description** (TextField)
   * @type {string}
   */
  description?: string;
  /**
   * **Order** (IntField)
   * @type {number}
   * @required true
   */
  order: number;
  /**
   * **ID** (IDField)
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
   * @description Tags associated with this Onboarding Step
   * @type {Array<any>}
   */
  in__tags?: Array<any>;
  onboardingField: ChildList<{
    /**
     * **Key** (DataField)
     * @description The unique identifier for the field, used in forms and data processing.
     * @type {string}
     * @required true
     */
    key: string;
    /**
     * **Label** (DataField)
     * @description The label for the field, displayed to the user.
     * @type {string}
     */
    label?: string;
    /**
     * **Placeholder** (DataField)
     * @description Placeholder text for the field, providing a hint to the user about what to enter.
     * @type {string}
     */
    placeholder?: string;
    /**
     * **Required** (BooleanField)
     * @description Indicates whether the field is required to be filled out by the user.
     * @type {boolean}
     */
    required: boolean;
    /**
     * **Description** (TextField)
     * @description A short description of the field, explaining its purpose and usage. This will be displayed to the user under the field input.
     * @type {string}
     */
    description?: string;
    /**
     * **Type** (ChoicesField)
     * @type {'DataField' | 'TextField' | 'EmailField' | 'PasswordField' | 'PhoneField' | 'URLField' | 'DateField' | 'TimeField' | 'TimeStampField' | 'BooleanField' | 'ChoicesField' | 'MultiChoiceField' | 'ListField' | 'JSONField' | 'ImageField' | 'FileField' | 'CurrencyField'}
     * @required true
     */
    type:
      | "DataField"
      | "TextField"
      | "EmailField"
      | "PasswordField"
      | "PhoneField"
      | "URLField"
      | "DateField"
      | "TimeField"
      | "TimeStampField"
      | "BooleanField"
      | "ChoicesField"
      | "MultiChoiceField"
      | "ListField"
      | "JSONField"
      | "ImageField"
      | "FileField"
      | "CurrencyField";
    /**
     * **Choices** (JSONField)
     * @type {Record<string, any>}
     */
    choices?: Record<string, any>;
    /**
     * **ID** (IDField)
     * @type {string}
     * @required true
     */
    id: string;
    /**
     * **Order** (IntField)
     * @description The order of this child in the list
     * @type {number}
     */
    order?: number;
    /**
     * **Created At** (TimeStampField)
     * @description The date and time this child was created
     * @type {number}
     * @required true
     */
    createdAt: number;
    /**
     * **Updated At** (TimeStampField)
     * @description The date and time this child was last updated
     * @type {number}
     * @required true
     */
    updatedAt: number;
    /**
     * **Parent** (ConnectionField)
     *
     * **EntryType** `onboardingStep`
     * @type {string}
     * @required true
     */
    parent: string;
    /**
     * **Parent Title** (DataField)
     * @type {string}
     */
    parent__title?: string;
  }>;
};
export type OnboardingStep = Base<OnboardingStepFields> & {
  _name: "onboardingStep";
  __fields__: OnboardingStepFields;
  /**
   * **Title** (DataField)
   * @type {string}
   * @required true
   */
  $title: string;
  /**
   * **Description** (TextField)
   * @type {string}
   */
  $description?: string;
  /**
   * **Order** (IntField)
   * @type {number}
   * @required true
   */
  $order: number;
  /**
   * **ID** (IDField)
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
   * @description Tags associated with this Onboarding Step
   * @type {Array<any>}
   */
  $in__tags?: Array<any>;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof OnboardingStep as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
  $onboardingField: ChildList<{
    /**
     * **Key** (DataField)
     * @description The unique identifier for the field, used in forms and data processing.
     * @type {string}
     * @required true
     */
    key: string;
    /**
     * **Label** (DataField)
     * @description The label for the field, displayed to the user.
     * @type {string}
     */
    label?: string;
    /**
     * **Placeholder** (DataField)
     * @description Placeholder text for the field, providing a hint to the user about what to enter.
     * @type {string}
     */
    placeholder?: string;
    /**
     * **Required** (BooleanField)
     * @description Indicates whether the field is required to be filled out by the user.
     * @type {boolean}
     */
    required: boolean;
    /**
     * **Description** (TextField)
     * @description A short description of the field, explaining its purpose and usage. This will be displayed to the user under the field input.
     * @type {string}
     */
    description?: string;
    /**
     * **Type** (ChoicesField)
     * @type {'DataField' | 'TextField' | 'EmailField' | 'PasswordField' | 'PhoneField' | 'URLField' | 'DateField' | 'TimeField' | 'TimeStampField' | 'BooleanField' | 'ChoicesField' | 'MultiChoiceField' | 'ListField' | 'JSONField' | 'ImageField' | 'FileField' | 'CurrencyField'}
     * @required true
     */
    type:
      | "DataField"
      | "TextField"
      | "EmailField"
      | "PasswordField"
      | "PhoneField"
      | "URLField"
      | "DateField"
      | "TimeField"
      | "TimeStampField"
      | "BooleanField"
      | "ChoicesField"
      | "MultiChoiceField"
      | "ListField"
      | "JSONField"
      | "ImageField"
      | "FileField"
      | "CurrencyField";
    /**
     * **Choices** (JSONField)
     * @type {Record<string, any>}
     */
    choices?: Record<string, any>;
    /**
     * **ID** (IDField)
     * @type {string}
     * @required true
     */
    id: string;
    /**
     * **Order** (IntField)
     * @description The order of this child in the list
     * @type {number}
     */
    order?: number;
    /**
     * **Created At** (TimeStampField)
     * @description The date and time this child was created
     * @type {number}
     * @required true
     */
    createdAt: number;
    /**
     * **Updated At** (TimeStampField)
     * @description The date and time this child was last updated
     * @type {number}
     * @required true
     */
    updatedAt: number;
    /**
     * **Parent** (ConnectionField)
     *
     * **EntryType** `onboardingStep`
     * @type {string}
     * @required true
     */
    parent: string;
    /**
     * **Parent Title** (DataField)
     * @type {string}
     */
    parent__title?: string;
  }>;
};
