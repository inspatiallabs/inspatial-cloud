import type { StackFrame } from "#/logger/types.ts";
import ColorMe from "#/utils/color-me.ts";

/**
 * Parse a stack frame (a line from Error().stack) into a StackFrame object
 * @param frame The stack frame to parse
 * @returns {StackFrame} The parsed stack frame
 */
export function parseStackFrame(frame: string | null): StackFrame {
  const stackFrame: StackFrame = {
    class: null,
    method: null,
    path: "",
    fileName: "",
    line: "",
    column: "",
  };
  if (!frame) {
    return stackFrame;
  }
  let match = frame.match(/at\s+(.*)\.(.*)\s+\((.*):(\d+):(\d+)\)/);
  if (match) {
    const [, class_, method, path, line, column] = match;
    return {
      ...stackFrame,
      class: class_.replace("async ", ""),
      method,
      path,
      fileName: path.split("/").pop() || "",
      line,
      column,
    };
  }

  match = frame.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/);
  if (match) {
    const [, method, path, line, column] = match;
    if (method === "eventLoopTick") {
      return stackFrame;
    }
    return {
      ...stackFrame,
      method,
      path,
      fileName: path.split("/").pop() || "",
      line,
      column,
    };
  }
  // match the file, line, and column
  match = frame.match(/at\s+(.*):(\d+):(\d+)/);
  if (match) {
    const [, path, line, column] = match;
    return {
      ...stackFrame,
      path,
      fileName: path.split("/").pop() || "",
      line,
      column,
    };
  }
  return stackFrame;
}

export function formatStackFrame(
  frame: StackFrame | null,
  color: boolean,
): string {
  if (!frame) {
    return "";
  }
  if (!color) {
    return `${frame.path}:${frame.line}:${frame.column}`;
  }

  let callerClass = "";
  let callerMethod = "";

  if (frame.method) {
    callerMethod = ColorMe.fromOptions(frame.method, { color: "brightYellow" });
  }
  if (frame.class) {
    callerClass = ColorMe.chain()
      .content(frame.class ? `${frame.class}.` : "")
      .color("brightGreen")
      .end();
  }
  const path = ColorMe.chain()
    .content(frame.path)
    .color("brightCyan")
    .content(":")
    .color("brightWhite")
    .content(frame.line)
    .color("brightYellow")
    .content(":")
    .color("brightWhite")
    .content(frame.column)
    .color("brightYellow")
    .end();
  return `${callerClass}${callerMethod}() ${path}`;
}
