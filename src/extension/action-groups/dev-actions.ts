import { CloudAPIGroup } from "@inspatial/cloud";
import { raiseORMException } from "../../orm/mod.ts";

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
devActions.addAction("run", {
  params: [{
    key: "code",
    type: "TextField",
  }],

  async run({ inCloud, orm, params: { code } }) {
    if (inCloud.getExtensionConfigValue("core", "cloudMode") === "production") {
      raiseORMException(
        "The run action is not available in production mode",
        "Dev",
        403,
      );
    }
    const resultRows: Array<any> = [];
    const log = (...args: any[]) => {
      for (const arg of args) {
        resultRows.push(arg);
      }
    };
    const func = new Function(
      "inCloud",
      "orm",
      "log",
      `return (async () => { ${code} })()`,
    );
    try {
      const result = await func(inCloud, orm, log);
      return {
        result,
        log: resultRows,
      };
    } catch (error) {
      return {
        result: { error: (error as Error).message },
        log: resultRows,
      };
    }
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
