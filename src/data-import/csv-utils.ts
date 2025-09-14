import convertString from "../utils/convert-string.ts";

function createCSV(
  data: Array<Record<string, any>>,
  columnMap?: Record<string, string>,
) {
  const headers = Object.keys(data[0]);
  const csv = [headers.join(",")];
  data.forEach((record) => {
    const values = headers.map((header) => {
      const value = record[header];
      if (typeof value === "object") {
        return JSON.stringify(value);
      }
      return value;
    });
    csv.push(values.join(","));
  });
  return csv.join("\n");
}

function parseCSV(data: string) {
  // Parse CSV
  const lines = [];
  let currentLine = "";
  let insideQuotes = false;
  let i = 0;
  for (const char of data) {
    if (char === '"' && data[i - 1] !== "\\") {
      insideQuotes = !insideQuotes;
    } else if (char === "\n" && !insideQuotes) {
      lines.push(processCSVLine(currentLine).map(sanitizeValue));
      currentLine = "";
      i++;
      continue;
    }
    currentLine += char;
    i++;
  }
  const headers: Array<string> = (lines[0] || []).map((header) => {
    const snake = convertString(header.trim(), "snake").replace(/_+/g, "_");
    return convertString(snake, "camel");
  });
  const records: Array<Record<string, unknown>> = [];
  for (let j = 1; j < lines.length; j++) {
    const record = new Map<string, unknown>();
    const values = lines[j];
    for (let k = 0; k < headers.length; k++) {
      record.set(headers[k], values[k]);
    }
    records.push(Object.fromEntries(record));
  }
  return {
    headers,
    records,
  };
}
function processCSVLine(line: string): string[] {
  const values = [];
  let current = "";
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i - 1] !== "\\") {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function sanitizeValue(str: string) {
  // Step 1: Remove single double quotes
  let cleanedStr = str.replace(/(?<!")"(?!")/g, "");
  // Step 2: Replace double double quotes with single quotes
  cleanedStr = cleanedStr.replace(/""/g, '"');

  // Step 3: Check if the string is a JSON object and parse it
  if (/^\{.*\}$/.test(cleanedStr)) {
    try {
      const parsed = JSON.parse(cleanedStr);
      return parsed;
    } catch (_e) {
      return cleanedStr;
    }
  }

  // otherwise return the cleaned string
  return cleanedStr;
}

export const csvUtils = {
  parseCSV,
  createCSV,
};
