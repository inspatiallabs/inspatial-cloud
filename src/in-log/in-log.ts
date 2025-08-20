import type {
  LoggerConfig,
  LogLevel,
  LogMessage,
  LogOptions,
  LogType,
  ServerLogConfig,
  StackFrame,
} from "~/in-log/types.ts";
import {
  formatStackFrame,
  parseStackFrame,
} from "~/in-log/stack-formatting.ts";
import { type BasicFgColor, ColorMe } from "~/terminal/color-me.ts";
import printUtils from "~/terminal/print-utils.ts";
import formatUtils from "~/terminal/format-utils.ts";
import { joinPath, normalizePath } from "../utils/path-utils.ts";
import { raiseCloudException } from "@inspatial/cloud";

const colorMap: Record<LogType, BasicFgColor> = {
  info: "brightGreen",
  error: "brightRed",
  warning: "brightYellow",
  debug: "brightBlue",
  message: "white",
};
export class ServeFileLogger {
  #logFileName: string;
  #maxFiles: number;
  #maxSize: number;
  /** default max read size is 300kb  */
  defaultReadSize: number = 300 * 1024; // 300KB
  #logPath: string;
  #logsPaths: Map<LogType, string> = new Map();
  callback?: (logType: LogType, message: string) => void;
  constructor(config: ServerLogConfig) {
    const { logName, logPath, maxFiles, maxSize, callBack } = config;
    this.callback = callBack;
    this.#maxFiles = maxFiles || 10;
    this.#maxSize = maxSize || 1024 * 1024 * 5; // 5MB
    this.#logFileName = logName;
    this.#logPath = normalizePath(logPath);
    for (const type of ["info", "debug", "warning", "error"] as LogType[]) {
      this.#logsPaths.set(
        type,
        joinPath(this.#logPath, `${this.#logFileName}.${type}.log`),
      );
    }
    this.validateLogPath();
  }

  private validateLogPath(): void {
    Deno.mkdirSync(this.#logPath, { recursive: true });
  }
  async clearLog(type: LogType) {
    const logPath = this.#logsPaths.get(type);
    if (!logPath) {
      throw new Error(`Log type ${type} does not exist.`);
    }
    try {
      await Deno.truncate(logPath, 0);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return;
      }
      throw error;
    }
  }
  async getLog(type: LogType, bytesSize?: number): Promise<string> {
    try {
      const file = await Deno.open(this.#logsPaths.get(type)!, {
        read: true,
        write: false,
      });
      const { size } = await file.stat();
      let readSize = this.defaultReadSize;
      if (bytesSize) {
        readSize = bytesSize;
      }
      if (readSize > size) {
        readSize = size;
      }
      const buffer = new Uint8Array(size);

      await file.seek(size * -1, Deno.SeekMode.End);
      const bytesRead = await file.read(buffer);
      file.close();
      return new TextDecoder().decode(buffer.subarray(0, bytesRead!));
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return "";
      }
      throw error;
    }
    return "";
  }
  private saveLogEntry(options: {
    content: string;
    type: LogType;
    subject: string;
  }): void {
    const { content, type, subject } = options;
    const time = new Date().toISOString();
    const logPath = this.#logsPaths.get(type)!;
    const logEntry = `[${time}] | [${subject}] | ${content}\n`;
    this.callback?.(type, logEntry);
    Deno.writeTextFileSync(logPath, logEntry, { append: true });
  }

  private sanitize(str: string): string {
    return str.replace(/[^a-zA-Z0-9\s]/g, "");
  }
  log(options: {
    content: any | any[];
    type: LogType;
    subject: string;
  }): void {
    this.saveLogEntry(options);
  }
}

/**
 * A logger for InSpatial Cloud
 */
export class InLog {
  fileLogger?: ServeFileLogger;
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
    this.#setupLogger();
  }
  #setupLogger() {
    if (!this.config.logFile) {
      return;
    }
    this.fileLogger = new ServeFileLogger(this.config.logFile);
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
    if (this.fileLogger) {
      logMessage.content.forEach((c) => {
        this.fileLogger?.log({
          content: Deno.inspect(c, { depth: 5 }),
          type,
          subject: logMessage.subject,
        });
      });
    }
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

if (!(globalThis as any).__INSPATIAL_CLOUD_LOGS__) {
  (globalThis as any).__INSPATIAL_CLOUD_LOGS__ = new Map();
}
export function createInLog(name: string, config: LoggerConfig): InLog {
  if (!(globalThis as any).__INSPATIAL_CLOUD_LOGS__) {
    (globalThis as any).__INSPATIAL_CLOUD_LOGS__ = new Map();
  }
  if ((globalThis as any).__INSPATIAL_CLOUD_LOGS__.has(name)) {
    raiseCloudException(
      `Logger with name "${name}" already exists. Use a different name or get the existing logger.`,
      {
        type: "warning",
      },
    );
  }
  const inLog = new InLog(config);
  (globalThis as any).__INSPATIAL_CLOUD_LOGS__.set(name, inLog);
  return inLog;
}

export function getInLog(name: string): InLog {
  if (!(globalThis as any).__INSPATIAL_CLOUD_LOGS__.has(name)) {
    raiseCloudException(
      `Logger with name "${name}" does not exist. Create a new logger with this name or use a different name.`,
      {
        type: "warning",
      },
    );
  }
  return (globalThis as any).__INSPATIAL_CLOUD_LOGS__.get(name)!;
}
