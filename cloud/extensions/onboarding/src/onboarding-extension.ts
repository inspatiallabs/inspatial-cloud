import { CloudExtension } from "@inspatial/cloud";

const onboardingExtension = new CloudExtension("onboarding", {
  description: "InSpatial Cloud Onboarding Extension",
  install() {},
  boot() {},
  label: "InSpatial Cloud Onboarding",
  version: "0.0.1",
  actionGroups: [],
  settingsTypes: [],
  middleware: [],
  pathHandlers: [],
  entryTypes: [],
});

export default onboardingExtension;
