import type { ChildList, SettingsBase as Base } from "@inspatial/cloud/types";

type OnboardingFields = {
  /**
   * **Enable Onboarding** (BooleanField)
   * @description Enable or disable onboarding for new users
   * @type {boolean}
   */
  enabled: boolean;
};
export type Onboarding = Base<OnboardingFields> & {
  _name: "onboarding";
  __fields__: OnboardingFields;
  /**
   * **Enable Onboarding** (BooleanField)
   * @description Enable or disable onboarding for new users
   * @type {boolean}
   */
  $enabled: boolean;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof Onboarding as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
};
