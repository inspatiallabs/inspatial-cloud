import { SettingsType } from "@inspatial/cloud";

const systemSettings = new SettingsType("systemSettings", {
  fields: [{
    key: "onboarded",
    type: "BooleanField",
    label: "Onboarded",
    description: "Whether the system onboarding is complete",
    readOnly: true,
  }],
});

export default systemSettings;
