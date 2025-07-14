import type { InField } from "../orm/field/field-def-types.ts";

export interface OnboardingStepConfig {
  title: string;
  description: string;
  skippable?: boolean;
  icon?: string;
  fields?: Array<InField>;
}
