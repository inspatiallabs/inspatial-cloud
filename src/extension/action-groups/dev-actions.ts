import { CloudAPIGroup } from "@inspatial/cloud";

export const devActions = new CloudAPIGroup("dev", {
  description: "Development actions",
  actions: [],
  label: "Dev",
});

devActions.addAction("generateConfig", {
  description: "Generate the cloud-config.json along with the schema",
  params: [],
  run({ inCloud }) {
    inCloud.generateConfigFile();
  },
});

devActions.addAction("clearStaticCache", {
  description: "Clear the static files cache",
  params: [],
  run({ inCloud }) {
    inCloud.static.cache.clear();
  },
});

devActions.addAction("getLog", {
  description: "Get the log file",
  params: [{
    key: "logType",
    type: "ChoicesField",
    required: true,
    defaultValue: "info",
    choices: [{
      key: "info",
      label: "Info",
    }, {
      key: "warning",
      label: "Warning",
    }, {
      key: "error",
      label: "Error",
    }, {
      key: "debug",
      label: "Debug",
    }],
  }],
  async run({ inCloud, params: { logType } }) {
    switch (logType) {
      case "info":
      case "warning":
      case "error":
      case "debug":
        break;
      default:
        return {
          content:
            `Invalid log type: ${logType}. Valid types are: info, warning, error, debug.`,
        };
    }
    const content = await inCloud.inLog.fileLogger?.getLog(logType);
    return { content };
  },
});
devActions.addAction("clearLog", {
  description: "Clear the log file",
  params: [{
    key: "logType",
    type: "ChoicesField",
    required: true,
    choices: [{
      key: "info",
      label: "Info",
    }, {
      key: "warning",
      label: "Warning",
    }, {
      key: "error",
      label: "Error",
    }, {
      key: "debug",
      label: "Debug",
    }],
  }],
  async run({ inCloud, params: { logType } }) {
    switch (logType) {
      case "info":
      case "warning":
      case "error":
      case "debug":
        break;
      default:
        return {
          content:
            `Invalid log type: ${logType}. Valid types are: info, warning, error, debug.`,
        };
    }
    await inCloud.inLog.fileLogger?.clearLog(logType);
    return { content: "Log file cleared." };
  },
});
