import { defineSettings } from "~/orm/mod.ts";

export const systemSettings = defineSettings(
  "systemSettings",
  {
    systemGlobal: true,
    fields: [{
      key: "enableSignup",
      label: "Enable User Signup",
      type: "BooleanField",
      description:
        "Enable user signup for new accounts. Turn off to prevent new users from signing up.",
      defaultValue: true,
    }, {
      key: "serverHost",
      label: "Server Host",
      type: "URLField",
      description:
        "The host URL of the server. This is used for generating links and API endpoints.",
      defaultValue: "http://localhost:8000",
      required: true,
    }],
    hooks: {
      afterUpdate: [{
        name: "cacheSettings",
        handler({ inCloud, systemSettings }) {
          inCloud.inCache.setValue(
            "systemSettings",
            "serverHost",
            systemSettings.$serverHost,
          );
        },
      }],
    },
  },
);
