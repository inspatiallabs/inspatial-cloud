import { SettingsType } from "#orm";
const authSettings = new SettingsType("authSettings", {
  label: "Auth Settings",
  fields: [{
    key: "enabled",
    type: "BooleanField",
    label: "Enabled",
    description: "Enable or disable authentication",
    defaultValue: true,
  }],
});

export default authSettings;
