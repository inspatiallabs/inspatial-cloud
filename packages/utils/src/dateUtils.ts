import { addLeadingZeros } from "#/stringUtils.ts";

function now(): Date {
  return new Date();
}

function nowTimestamp(): number {
  return now().getTime();
}

function nowFormatted(format: DateFormat, showSeconds?: boolean): string {
  return getPrettyDate(nowTimestamp(), { format, showSeconds });
}
function isToday(date: Date, now?: Date): boolean {
  const today = now || new Date();
  return date.getDate() == today.getDate() &&
    date.getMonth() == today.getMonth() &&
    date.getFullYear() == today.getFullYear();
}

function isYesterday(date: Date, now?: Date): boolean {
  const yesterday = now || new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.getDate() == yesterday.getDate() &&
    date.getMonth() == yesterday.getMonth() &&
    date.getFullYear() == yesterday.getFullYear();
}
export type DateFormat =
  | "standard"
  | "pretty"
  | "time"
  | "date"
  | "datetime"
  | "compact"
  | "y/m/d";

function getPrettyDate(value: string | number, options?: {
  format?: DateFormat;
  showSeconds?: boolean;
}): string {
  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return value as string;
  }
  const formatPretty = (date: Date) => {
    const now = new Date();

    let title = "";
    let dateStr = date.toLocaleTimeString(
      undefined,
      { hour: "2-digit", minute: "2-digit" },
    );
    if (options?.showSeconds) {
      dateStr = date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    if (now.toLocaleDateString() == date.toLocaleDateString()) {
      title = "Today at";

      return `${title} ${dateStr}`;
    }
    if (now.getFullYear() == date.getFullYear()) {
      if (
        date.getMonth().toString() + (date.getDay() + 1).toString() ==
          now.getMonth().toString() + now.getDay().toString()
      ) {
        title = "Yesterday at";
        return `${title} ${dateStr}`;
      }
    }
    let response = date.toString().substring(0, 15);
    if (options?.showSeconds) {
      response = date.toString().substring(0, 21);
    }
    return response;
  };
  const formatDate = (date: Date, separator?: string) => {
    separator = separator || "-";
    const day = addLeadingZeros(date.getDate());
    const month = addLeadingZeros(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${year}${separator}${month}${separator}${day}`;
  };
  const formatCompact = (date: Date) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    let title = `${addLeadingZeros(day)}/${addLeadingZeros(month + 1)}`;

    if (currentYear != year) {
      title = `${title}/${year}`;
    }
    if (isToday(date, now)) {
      title = date.toLocaleTimeString(undefined, {
        hour: "numeric",
        hour12: false,
        minute: "numeric",
      });
    }
    if (isYesterday(date, now)) {
      title = "Yesterday";
    }

    return title;
  };
  const format = options?.format || "standard";
  switch (format) {
    case "pretty":
      return formatPretty(date);
    case "date":
      return formatDate(date);
    case "compact":
      return formatCompact(date);
    case "time":
      return date.toLocaleTimeString();
    case "y/m/d":
      return formatDate(date, "/");
    case "datetime":
      return date.toLocaleString();
    default: {
      const day = addLeadingZeros(date.getDate());
      const month = addLeadingZeros(date.getMonth() + 1);
      const year = date.getFullYear();
      const hours = addLeadingZeros(date.getHours());
      const minutes = addLeadingZeros(date.getMinutes());
      const seconds = addLeadingZeros(date.getSeconds());
      return `${day}-${month}-${year} ${hours}:${minutes}${
        options?.showSeconds ? `:${seconds}` : ""
      }`;
    }
  }
}
export default {
  now,
  nowTimestamp,
  nowFormatted,
  isToday,
  isYesterday,
  getPrettyDate,
};
export { getPrettyDate, isToday, isYesterday, now, nowFormatted, nowTimestamp };
