function now(): Date {
  return new Date();
}
function padZeros(number: number, length?: number) {
  return number.toString().padStart(length || 2, "0");
}

function nowTimestamp(): number {
  return now().getTime();
}

function nowFormatted(format: DateFormat, showSeconds?: boolean): string {
  return getPrettyDate(nowTimestamp(), { format, showSeconds }) as string;
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
  | "y/m/d"
  | "full"
  | "dd.mm.yy";

function formatTime(value: string | undefined, options: {
  showSeconds?: boolean;
  clockType?: "12" | "24";
}): string {
  if (!value) {
    return "";
  }
  const match = value.match(
    /(?<hour>\d{2}):(?<minute>\d{2}):{0,1}(?<second>\d{2}){0,1}/,
  );
  if (!match) {
    return "";
  }
  const groups = match.groups!;
  const hour = parseInt(groups.hour);
  const minute = parseInt(groups.minute).toString().padStart(2, "0");
  const second = parseInt(groups.second);
  if (options?.clockType === "12") {
    let hourString;
    let ampm = hour < 12 ? "AM" : "PM";
    hourString = hour % 12 || 12;
    return `${hourString}:${minute}${
      options.showSeconds ? `:${second}` : ""
    } ${ampm}`;
  }
  return `${hour.toString().padStart(2, "0")}:${minute}${
    options.showSeconds ? `:${second}` : ""
  }`;
}
function getPrettyDate(value: string | number | undefined, options?: {
  format?: DateFormat;
  showSeconds?: boolean;
  showTime?: boolean;
}): string {
  if (!value) return "";
  const date = new Date(value);
  // convert to local time
  // date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  if (isNaN(date.getTime())) {
    return `${value}`;
  }
  const formatPretty = (date: Date) => {
    const now = new Date();

    let title = "";
    let timeStr = date.toLocaleTimeString(
      undefined,
      { hour: "2-digit", minute: "2-digit" },
    );
    if (options?.showSeconds) {
      timeStr = date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    if (now.toLocaleDateString() == date.toLocaleDateString()) {
      title = "Today at";

      return `${title} ${timeStr}`;
    }
    if (now.getFullYear() == date.getFullYear()) {
      if (
        date.getMonth().toString() + (date.getDay() + 1).toString() ==
          now.getMonth().toString() + now.getDay().toString()
      ) {
        title = "Yesterday at";
        return `${title} ${timeStr}`;
      }
    }

    let response = date.toString().substring(4, 15);
    if (options?.showTime) {
      response += ` at ${timeStr}`;
    }
    if (options?.showSeconds) {
      response += `:${padZeros(date.getSeconds())}`;
    }
    return response;
  };
  const formatDate = (date: Date) => {
    const day = padZeros(date.getDate());
    const month = padZeros(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  const formatCompact = (date: Date) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    let title = `${padZeros(day)}/${padZeros(month + 1)}`;

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
    case "full":
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    case "dd.mm.yy":
      return date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).replace(/\//g, ".");
    default: {
      const day = padZeros(date.getDate());
      const month = padZeros(date.getMonth() + 1);
      const year = date.getFullYear();
      const hours = padZeros(date.getHours());
      const minutes = padZeros(date.getMinutes());
      const seconds = padZeros(date.getSeconds());
      return `${day}/${month}/${year} ${hours}:${minutes}${
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
const dateUtils = {
  now,
  nowTimestamp,
  nowFormatted,
  isToday,
  isYesterday,
  getPrettyDate,
};

export {
  dateUtils,
  getPrettyDate,
  isToday,
  isYesterday,
  now,
  nowFormatted,
  nowTimestamp,
};
