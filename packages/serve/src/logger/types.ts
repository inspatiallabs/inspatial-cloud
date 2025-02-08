/**
 * The log levels
 */
export type LogType = "error" | "info" | "warning" | "debug" | "message";

/**
 * A parsed stack frame
 */
export interface StackFrame {
  /**
   * The class of the caller
   */
  class: string | null;
  /**
   * The method of the caller
   */
  method: string | null;
  /**
   * The path of the file
   */
  path: string;
  /**
   * The name of the file
   */
  fileName: string;
  /**
   * The line number of the caller
   */
  line: string;
  /**
   * The column number of the caller
   */
  column: string;
}

/**
 * A log message
 */

export interface LogMessage {
  /**
   * The content of the log message
   */
  content: any[];
  /**
   * The type of log message
   */
  type: LogType;
  /**
   * The subject of the log message
   */
  subject: string;
  /**
   * The stack frame of the caller
   */
  caller: StackFrame;
  /**
   * The timestamp of the log message
   */
  timestamp: Date;
}

/**
 * Options for logging
 */
export interface LogOptions {
  /**
   * The subject of the log message
   */
  subject?: string;
}

/**
 * The configuration for the logger
 */
export interface LoggerConfig {
  /**
   * The offset to use when isolating the stack trace call frame
   */
  traceOffset?: number;
  /**
   * The default style for console logging
   */
  consoleDefaultStyle: "compact" | "full";
}
