import type {
  LoggerConfig,
  LogLevel,
  LogMessage,
  LogOptions,
  LogType,
  StackFrame,
} from "~/in-log/types.ts";
import {
  formatStackFrame,
  parseStackFrame,
} from "~/in-log/stack-formatting.ts";
import { type BasicFgColor, ColorMe } from "~/terminal/color-me.ts";
import printUtils from "~/terminal/print-utils.ts";
import formatUtils from "~/terminal/format-utils.ts";

const colorMap: Record<LogType, BasicFgColor> = {
  info: "brightGreen",
  error: "brightRed",
  warning: "brightYellow",
  debug: "brightBlue",
  message: "white",
};
export class ServeFileLogger {
  environment: "development" | "production";
  logPath: string;

  constructor() {
    this.environment = "development";
    this.logPath = "./logs";
    this.validateLogPath();
  }

  private validateLogPath(): void {
    Deno.mkdirSync(this.logPath, { recursive: true });
  }

  private saveLogEntry(options: {
    content: string;
    type: LogType;
    subject: string;
  }): void {
    const { content, type, subject } = options;
    const time = new Date().toISOString();
    const logPath = `${this.logPath}/${type}.log`;
    const logEntry = `[${time}] ${type.toUpperCase()} ${subject}: ${
      this.sanitize(content)
    }`;
    Deno.writeTextFileSync(logPath, logEntry + "\n", { append: true });
  }

  private sanitize(str: string): string {
    return str.replace(/[^a-zA-Z0-9\s]/g, "");
  }
  log(options: {
    content: any | any[];
    type: LogType;
    subject: string;
  }): void {
    if (typeof options.content !== "string") {
      options.content = String(options.content);
    }
    this.saveLogEntry(options);
  }
}

/**
 * A logger for InSpatial Cloud
 */
export class InLog {
  /**
   * The name of the logger
   */
  name: string;
  /**
   * The configuration for the logger
   */
  config: LoggerConfig;

  get #envLoaded(): boolean {
    return this.#logLevel !== undefined;
  }

  #logLevel: LogLevel = "info";
  #logTrace: boolean = false;
  #lineChar: string;
  /**
   * Create a new ServeLogger
   * @param config The configuration for the logger
   * @example
   * ```ts
   * const logger = new ServeLogger({
   *  consoleDefaultStyle: "full",
   *  traceOffset: 1,
   * });
   * ```
   */
  constructor(config: LoggerConfig) {
    this.config = config;
    this.name = config.name || "";
    this.#lineChar = printUtils.symbol.box.horizontal;
    this.#loadEnv();
  }
  setConfig(config: {
    logLevel?: LogLevel;
    logTrace?: boolean;
  }): void {
    this.#logLevel = config.logLevel || this.#logLevel;
    switch (config.logTrace) {
      case true:
      case false:
        this.#logTrace = config.logTrace;
        break;
    }
  }
  #loadEnv() {
    if (this.#envLoaded) {
      return;
    }
    const env = Deno.env.get("LOG_LEVEL");
    const logTrace = Deno.env.get("LOG_TRACE");
    if (logTrace) {
      this.#logTrace = logTrace === "true";
    }
    if (!env) {
      return;
    }
    if (env) {
      const logLevel = env.toLowerCase() as LogLevel;
      if (!["debug", "info", "warning", "error"].includes(logLevel)) {
        return;
      }
      this.#logLevel = logLevel;
    }
  }

  /**
   * Log a debug message
   */
  debug(content: any | any[]): void;
  /**
   * Log a debug message
   */
  debug(content: any | any[], subject: string): void;
  /**
   * Log a debug message
   */
  debug(content: any | any[], options: LogOptions): void;
  /**
   * Log a debug message
   */
  debug(content: any | any[], subject: string, options: LogOptions): void;

  /**
   * Log a debug message
   */
  debug(
    content: any | any[],
    subjectOrOptions?: string | LogOptions,
    options?: LogOptions,
  ): void {
    if (this.#logLevel !== "debug") {
      return;
    }
    this.#log("debug", content, subjectOrOptions, options);
  }

  /**
   * Log an info message
   */
  info(content: any | any[]): void;
  /**
   * Log an info message
   */
  info(content: any | any[], subject: string): void;
  /**
   * Log an info message
   */
  info(content: any | any[], options: LogOptions): void;
  /**
   * Log an info message
   */
  info(content: any | any[], subject: string, options: LogOptions): void;
  /**
   * Log an info message
   */
  info(
    content: any | any[],
    subjectOrOptions?: string | LogOptions,
    options?: LogOptions,
  ): void {
    if (
      this.#logLevel &&
      (this.#logLevel !== "info" && this.#logLevel !== "debug")
    ) {
      return;
    }
    this.#log("info", content, subjectOrOptions, options);
  }

  /**
   * Log a warning message
   */
  warn(content: any | any[]): void;
  /**
   * Log a warning message
   */
  warn(content: any | any[], subject: string): void;
  /**
   * Log a warning message
   */
  warn(content: any | any[], options: LogOptions): void;
  /**
   * Log a warning message
   */
  warn(content: any | any[], subject: string, options: LogOptions): void;
  /**
   * Log a warning message
   */
  warn(
    content: any | any[],
    subjectOrOptions?: string | LogOptions,
    options?: LogOptions,
  ): void {
    this.#log("warning", content, subjectOrOptions, options);
  }

  /**
   * Log an error message
   */
  error(content: any | any[]): void;
  /**
   * Log an error message and subject
   */
  error(content: any | any[], subject: string): void;
  /**
   * Log an error message and options
   */
  error(content: any | any[], options: LogOptions): void;
  /**
   * Log an error message, subject, and options
   */
  error(content: any | any[], subject: string, options: LogOptions): void;
  /**
   * Log an error message, subject, and options
   */
  error(
    content: any | any[],
    subjectOrOptions?: string | LogOptions,
    options?: LogOptions,
  ): void {
    this.#log("error", content, subjectOrOptions, options);
  }

  #log(
    type: LogType,
    content: any | any[],
    subjectOrOptions?: string | LogOptions,
    options?: LogOptions,
  ) {
    this.#loadEnv();
    switch (typeof subjectOrOptions) {
      case "string":
        options = { subject: subjectOrOptions, ...options };
        break;
      case "object":
        options = subjectOrOptions;
        break;
    }

    const frame = this.#getCallFrame(options?.stackTrace);
    const logMessage: LogMessage = {
      type,
      subject: options?.subject || type.toUpperCase(),
      content: [content],
      caller: frame,
      timestamp: new Date(),
      compact: options?.compact ||
        this.config.consoleDefaultStyle === "compact",
    };
    const formatted = this.#formatLogMessage(logMessage);
    console.log(formatted);
  }

  /**
   * Format the log message into a colored and styled string to be printed to the console
   */
  #formatLogMessage(message: LogMessage) {
    const { content, type, subject, caller, timestamp: _timestamp, compact } =
      message;
    const color: BasicFgColor = colorMap[type];
    if (compact) {
      const contentString = content.map((c) => {
        if (typeof c === "string") {
          return c;
        }
        if (c instanceof Map) {
          return JSON.stringify(Object.fromEntries(c), null, 2);
        }
        if (Array.isArray(c)) {
          return c.map((item) => {
            if (typeof item === "string") {
              return item;
            }
            return JSON.stringify(item, null, 2);
          }).join(", ");
        }
        return JSON.stringify(c, null, 2);
      }).join(", ");
      return ColorMe.standard()
        .content(`[${subject}] `)
        .color(color)
        .content(contentString).end();
    }
    let title = subject;
    if (this.name) {
      title = `${this.name} - ${subject}`;
    }
    const titleRow = formatUtils.center(title, this.#lineChar, {
      color,
    });
    let frame = "";
    if (Array.isArray(caller)) {
      frame = caller.filter((c) => c.class || c.method).map((c) =>
        formatStackFrame(c, true)
      ).join("\n");
    } else {
      frame = formatStackFrame(caller, true);
    }
    const formattedContent = content.map((c) => {
      if (typeof c === "string") {
        return formatUtils.center(c);
      }
      if (c instanceof Map) {
        return JSON.stringify(Object.fromEntries(c), null, 2);
      }
      if (Array.isArray(c)) {
        return c.map((item) => {
          if (typeof item === "string") {
            return formatUtils.center(item);
          }
          return JSON.stringify(item, null, 2);
        }).join("\n");
      }

      return JSON.stringify(c, null, 2);
    });

    const endRow = formatUtils.fill(this.#lineChar, {
      color,
    });

    const lines = [
      " ",
      titleRow,
    ];
    lines.push(" ");

    if (type == "error" || this.#logTrace) {
      lines.push(frame);
      lines.push(" ");
    }
    lines.push(...formattedContent);
    lines.push(" ");
    lines.push(endRow);
    lines.push(" ");
    return lines.join("\n");
  }
  /**
   * Get the call frame of the function that called the logger
   */
  #getCallFrame(stackTrace?: string): StackFrame | Array<StackFrame> {
    const stack = stackTrace || new Error().stack;
    if (!stack) {
      return parseStackFrame(null);
    }
    const offset = this.config.traceOffset || 0;
    const parts = stack.split("\n");
    if (stackTrace) {
      return parts.map((part) => {
        return parseStackFrame(part);
      });
    }
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].includes("ServeLogger.#log")) {
        return parseStackFrame(parts[i + offset + 1]);
      }
    }
    return parseStackFrame(null);
  }
}

export const inLog = new InLog({
  consoleDefaultStyle: "full",
  name: "InSpatial Cloud",
  traceOffset: 1,
});
