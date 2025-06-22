import ColorMe, {
  type BasicFgColor,
  type StyleOptions,
} from "#terminal/color-me.ts";

export function getConsoleWidth(): number {
  try {
    return Deno.consoleSize().columns;
  } catch (_e) {
    return 80;
  }
}
export function getCharCount(content: string): number {
  const bytes = new TextEncoder().encode(content);
  let count = 0;
  let inAnsi = false;
  for (let i = 0; i < bytes.length; i++) {
    if (inAnsi) {
      if (bytes[i] == 109) {
        inAnsi = false;
      }
      continue;
    }
    if (bytes[i] == 0x1b) {
      inAnsi = true;
      continue;
    }

    if (bytes[i] >= 0x20 && bytes[i] <= 0x7e) {
      count++;
    }

    if (bytes[i] == 0xe2) {
      // if (bytes[i + 1] == 0x80 && bytes[i + 2] == 0x99) {
      count++;
      i += 2;
      continue;
      // }
    }

    if (bytes[i] == 0xf0) {
      count++;
      i += 3;
    }
  }

  return count;
}
export function getCenterOffset(content: string, width: number): number {
  const contentLength = getCharCount(content);
  const result = (width - contentLength) / 2;
  // round to the nearest whole number
  return Math.floor(result) + 1;
}
export function center(content: string, char?: string, options?: {
  contentColor?: BasicFgColor;
  fillerColor?: BasicFgColor;
  color?: BasicFgColor;
}): string {
  const repeatChar = char || " ";
  const width = getConsoleWidth();

  const contentLength = getCharCount(content);
  let center = (width - contentLength - 2) / 2;
  if (center < 0) {
    center = 0;
  }
  let filler = repeatChar.repeat(
    center,
  );
  if (options?.color) {
    return ColorMe.chain().content(filler).color(options.color).content(
      ` ${content} `,
    ).color(
      options.color,
    ).content(filler).end();
  }
  if (options?.contentColor) {
    content = ColorMe.standard().content(content).color(options.contentColor)
      .format();
  }
  if (options?.fillerColor) {
    filler = ColorMe.standard().content(filler).color(options.fillerColor)
      .format();
  }
  return `${filler} ${content} ${filler}`;
}

export function fill(
  char: string,
  options?: StyleOptions,
): string {
  const width = getConsoleWidth();
  const line = char.repeat(width);
  if (options) {
    const color = options.color || "white";
    return ColorMe.fromOptions(line, { color, ...options });
  }
  return line;
}

export default {
  center,
  fill,
  getCenterOffset,
  getCharCount,
  getConsoleWidth,
};
