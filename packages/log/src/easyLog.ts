import type { LogType } from "#/logging.ts";
import { formatStackFrame, parseStackFrame } from "#/utils.ts";
import type {
  EasyLogConfig,
  LogMessage,
  LogOptions,
  StackFrame,
} from "#/types.ts";
import type { BasicFgColor } from "#utils/colorMe";
import formatUtils from "#utils/formatUtils";
import printUtils from "#utils/printUtils";

const colorMap: Record<LogType, BasicFgColor> = {
  info: "brightGreen",
  error: "brightRed",
  warning: "brightYellow",
  debug: "brightBlue",
  message: "white",
};
export class EasyLogger {
  environment: "development" | "production";
  logPath: string;

  constructor() {
    this.environment = "development";
    this.logPath = "./logs";
    this.validateLogPath();
  }

  private validateLogPath() {
    Deno.mkdirSync(this.logPath, { recursive: true });
  }

  private saveLogEntry(options: {
    content: string;
    type: LogType;
    subject: string;
  }) {
    const { content, type, subject } = options;
    const time = new Date().toISOString();
    const logPath = `${this.logPath}/${type}.log`;
    const logEntry = `[${time}] ${type.toUpperCase()} ${subject}: ${
      this.sanitize(content)
    }`;
    Deno.writeTextFileSync(logPath, logEntry + "\n", { append: true });
  }

  private sanitize(str: string) {
    return str.replace(/[^a-zA-Z0-9\s]/g, "");
  }
  log(options: {
    content: any | any[];
    type: LogType;
    subject: string;
  }) {
    if (typeof options.content !== "string") {
      options.content = String(options.content);
    }
    this.saveLogEntry(options);
  }
}

export class EasyLog {
  config: EasyLogConfig;
  private lineChar: string;
  constructor(config: EasyLogConfig) {
    this.config = config;
    this.lineChar = printUtils.symbol.box.horizontal;
  }

  debug(content: any | any[]): void;
  debug(content: any | any[], subject: string): void;
  debug(content: any | any[], options: LogOptions): void;
  debug(content: any | any[], subject: string, options: LogOptions): void;
  debug(
    content: any | any[],
    subjectOrOptions?: string | LogOptions,
    options?: LogOptions,
  ) {
    this.log("debug", content, subjectOrOptions, options);
  }
  info(content: any | any[]): void;
  info(content: any | any[], subject: string): void;
  info(content: any | any[], options: LogOptions): void;
  info(content: any | any[], subject: string, options: LogOptions): void;
  info(
    content: any | any[],
    subjectOrOptions?: string | LogOptions,
    options?: LogOptions,
  ) {
    this.log("info", content, subjectOrOptions, options);
  }

  warn(content: any | any[]): void;
  warn(content: any | any[], subject: string): void;
  warn(content: any | any[], options: LogOptions): void;
  warn(content: any | any[], subject: string, options: LogOptions): void;
  warn(
    content: any | any[],
    subjectOrOptions?: string | LogOptions,
    options?: LogOptions,
  ) {
    this.log("warning", content, subjectOrOptions, options);
  }
  error(content: any | any[]): void;
  error(content: any | any[], subject: string): void;
  error(content: any | any[], options: LogOptions): void;
  error(content: any | any[], subject: string, options: LogOptions): void;
  error(
    content: any | any[],
    subjectOrOptions?: string | LogOptions,
    options?: LogOptions,
  ) {
    this.log("error", content, subjectOrOptions, options);
  }

  private log(
    type: LogType,
    content: any | any[],
    subjectOrOptions?: string | LogOptions,
    options?: LogOptions,
  ) {
    const frame = this.getCallFrame();
    switch (typeof subjectOrOptions) {
      case "string":
        options = { subject: subjectOrOptions, ...options };
        break;
      case "object":
        options = subjectOrOptions;
        break;
    }
    // console.log(formatStackFrame(frame, false));
    const logMessage: LogMessage = {
      type,
      subject: options?.subject || type.toUpperCase(),
      content: [content],
      caller: frame,
      timestamp: new Date(),
    };
    const formatted = this.formatLogMessage(logMessage);
    console.log(formatted);
  }

  private formatLogMessage(message: LogMessage) {
    const { content, type, subject, caller, timestamp } = message;
    const color: BasicFgColor = colorMap[type];
    const titleRow = formatUtils.center(subject, this.lineChar, {
      color,
    });
    const frame = formatStackFrame(caller, true);
    const formattedContent = content.map((c) => {
      if (typeof c === "string") {
        return formatUtils.center(c);
      }
      if (c instanceof Map) {
        return JSON.stringify(Object.fromEntries(c), null, 2);
      }

      return JSON.stringify(c, null, 2);
    });
    const endRow = formatUtils.fill(this.lineChar, {
      color,
    });

    const lines = [
      " ",
      titleRow,
      " ",
      formatUtils.center(frame),
      " ",
      ...formattedContent,
      " ",
      endRow,
      " ",
    ];
    return lines.join("\n");
  }
  private getCallFrame(): StackFrame {
    const stack = new Error().stack;
    if (!stack) {
      return parseStackFrame(null);
    }
    const offset = this.config.traceOffset || 0;
    const parts = stack.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].includes("EasyLog.log")) {
        return parseStackFrame(parts[i + offset + 1]);
      }
    }
    return parseStackFrame(null);
  }
}
