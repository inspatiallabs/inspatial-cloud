import { type BasicFgColor, ColorMe } from "#utils";
// import { EasyLogger } from "#/easyLog.ts";
import printUtils from "#utils/printUtils";
import formatUtils from "#utils/formatUtils";
const { symbol } = printUtils;
const tab = "  ";
export type LogType = "error" | "info" | "warning" | "debug" | "message";

const typeColors: Record<LogType, BasicFgColor> = {
  error: "red",
  info: "green",
  warning: "yellow",
  debug: "blue",
  message: "white",
} as const;

const box = printUtils.symbol.box;

interface LogOptions {
  hideTrace?: boolean;
  traceOffset?: number;
  stack?: string;
  compact?: boolean;
}
export const easyLog = {
  message: (
    content: any | any[],
    subject?: string,
    options?: LogOptions,
  ): void => log({ content, type: "message", subject, ...options }),
  error: (
    content: any | any[],
    subject?: string,
    options?: LogOptions,
  ): void => log({ content, type: "error", subject, ...options }),
  info: (content: any | any[], subject?: string, options?: LogOptions): void =>
    log({ content, type: "info", subject, ...options }),
  warning: (
    content: any | any[],
    subject?: string,
    options?: LogOptions,
  ): void => log({ content, type: "warning", subject, ...options }),
  debug: (content: any | any[], subject?: string, options?: LogOptions): void =>
    log({ content, type: "debug", subject, ...options }),
} as const;

// const logger = new EasyLogger();

function log(options: {
  content: any | any[];
  type?: LogType;
  subject?: string;
  hideTrace?: boolean;
  stack?: string;
  compact?: boolean;
  traceOffset?: number;
}) {
  const env = "development" as "development" | "production";
  let { content, type, subject, hideTrace, stack } = options;
  if (!type && !subject) {
    type = "debug";
  }
  const message: string[] = [];

  const title = subject || type || "Log";
  if (["error", "warning"].includes(type!)) {
    // logger.log({ content, type: type!, subject: title });
  }
  if (env === "production") {
    return;
  }
  const showTrace = type === "error" || type === "warning";
  const shouldHideTrace = hideTrace && type != "debug";
  if (showTrace && !shouldHideTrace) {
    //get the calling function
    stack = stack || new Error().stack;
    let lines: string[] = [];

    const offset = options.traceOffset ? options.traceOffset + 1 : 1;
    const stackLines = stack?.split("\n") || [];
    const stackLinesFilter = stackLines.slice(offset);
    stackLinesFilter.forEach((line, index) => {
      line = line.trim().replace("at ", "");
      let out = line;

      if (!line.startsWith("file://")) {
        const args = line.split(" (");
        let func = args[0];
        if (func.includes(".")) {
          const fullFunc = func.split(".");
          func = ColorMe.chain().content(fullFunc[fullFunc.length - 2])
            .color("brightGreen")
            .content(".")
            .color("white")
            .content(fullFunc[fullFunc.length - 1])
            .color("brightYellow")
            .content("()")
            .color("brightWhite")
            .end();

          // func = `${fgGreen}${fullFunc[fullFunc.length - 2]}.${fgYellow}${
          //   fullFunc[fullFunc.length - 1]
          // }${fgWhite}()${reset}`;
        } else {
          func = ColorMe.chain().content(func)
            .color("brightYellow")
            .content("()")
            .color("brightWhite")
            .end();
        }

        func = func.replace("async ", "");
        const file = args[1]?.replace(")", "");
        let tabs = "";
        for (let i = 0; i < index; i++) {
          tabs += tab;
        }
        out = `${func} ${ColorMe.fromOptions(file, { color: "brightCyan" })}`;
        if (line.includes("ext:")) {
          return;
        }
      }
      if (line.startsWith("file://")) {
        out = ColorMe.standard()
          .content("Start ").color("brightWhite").bold()
          .content(symbol.arrowRight + " ").color("brightMagenta")
          .bold()
          .content(line).color("brightCyan")
          .end();
      }

      lines.push(`${out}\n`);
    });

    lines = lines.reverse();

    if (type === "error") {
      message.push(lines.join("\n"));
    } else {
      message.push(lines[lines.length - 1].trim());
    }
  }
  const args = Array.isArray(content) ? content : [content];
  //
  const contentStr = args.map((arg) => {
    if (typeof arg === "object") {
      return JSON.stringify(arg, null, 2);
    }

    return formatUtils.center(arg);
  });
  message.push(...contentStr);
  // message.push(reset);
  // printUtils.symbols;
  // message.push();
  if (options.compact) {
    printCompactMessage(title, message, type);
    return;
  }
  const titleRow = formatUtils.center(title, box.horizontal, {
    color: typeColors[type || "message"],
  });

  // printUtils.println(titleRow);
  console.log(titleRow);
  // printUtils.printLines(1);
  console.log();
  for (const line of message) {
    // printUtils.println(line);
    console.log(line);
  }
  const row = formatUtils.fill(box.horizontal, {
    color: typeColors[type || "message"],
  });
  // printUtils.printLines(1);
  console.log();
  // printUtils.println(row);
  console.log(row);
  // printUtils.printLines(1);
  console.log();
}

function printCompactMessage(title: string, message: string[], type?: LogType) {
  const label = ColorMe.fromOptions(title, {
    color: typeColors[type || "message"],
  });
  for (const line of message) {
    console.log(`${label}: ${line.trim()}`);
  }
}
