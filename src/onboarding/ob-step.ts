import { ChildEntryType, EntryType } from "@inspatial/cloud";
import type { OnboardingStep } from "./_onboarding-step.type.ts";

export const onboardingStep = new EntryType<OnboardingStep>("onboardingStep", {
  systemGlobal: true,
  titleField: "title",
  defaultListFields: ["order", "description"],
  fields: [{
    key: "title",
    type: "DataField",
    required: true,
  }, {
    key: "description",
    type: "TextField",
  }, {
    key: "order",
    type: "IntField",
    defaultValue: 0,
    required: true,
  }],
  children: [
    new ChildEntryType("onboardingField", {
      fields: [{
        key: "key",
        type: "DataField",
        required: true,
        description:
          "The unique identifier for the field, used in forms and data processing.",
      }, {
        key: "label",
        type: "DataField",
        description: "The label for the field, displayed to the user.",
      }, {
        key: "placeholder",
        type: "DataField",
        description:
          "Placeholder text for the field, providing a hint to the user about what to enter.",
      }, {
        key: "required",
        type: "BooleanField",
        defaultValue: false,
        description:
          "Indicates whether the field is required to be filled out by the user.",
      }, {
        key: "description",
        type: "TextField",
        description:
          "A short description of the field, explaining its purpose and usage. This will be displayed to the user under the field input.",
      }, {
        key: "type",
        type: "ChoicesField",
        required: true,
        choices: [{
          key: "DataField",
          label: "Data",
        }, {
          key: "TextField",
          label: "Text",
        }, {
          key: "EmailField",
          label: "Email",
        }, {
          key: "PasswordField",
          label: "Password",
        }, {
          key: "PhoneField",
          label: "Phone",
        }, {
          key: "URLField",
          label: "URL",
        }, {
          key: "DateField",
          label: "Date",
        }, {
          key: "TimeField",
          label: "Time",
        }, {
          key: "TimeStampField",
          label: "Date and Time",
        }, {
          key: "BooleanField",
          label: "Boolean (Yes/No)",
        }, {
          key: "ChoicesField",
          label: "Choices (Single Select)",
        }, {
          key: "MultiChoiceField",
          label: "Multi-Choice (Multiple Select)",
        }, {
          key: "ListField",
          label: "List (Array of Values)",
        }, {
          key: "JSONField",
          label: "JSON Object",
        }, {
          key: "ImageField",
          label: "Image",
        }, {
          key: "FileField",
          label: "File",
        }, {
          key: "CurrencyField",
          label: "Currency",
        }],
      }, {
        key: "choices",
        type: "JSONField",
      }],
    }),
  ],
});

// IDField: string;
// DataField: string;
// IntField: number;
// BigIntField: bigint;
// DecimalField: number;
// DateField: string;
// TimeStampField: number;
// BooleanField: boolean;
// PasswordField: string;
// ChoicesField: string | number;
// MultiChoiceField: string[];
// TextField: string;
// EmailField: string;
// ImageField: string;
// FileField: string;
// JSONField: Record<string, unknown>;
// PhoneField: string;
// ConnectionField: {
//   id: string;
//   display: string;
// };
// RichTextField: Record<string, unknown>;
// URLField: string;
// ListField: string[];
// CurrencyField: number;
// TimeField: string;
