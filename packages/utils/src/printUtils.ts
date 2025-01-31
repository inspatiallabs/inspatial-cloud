import { ColorMe } from "#/colorMe.ts";
import type { BasicBgColor, BasicFgColor, StyleOptions } from "#/colorMe.ts";

const encoder = new TextEncoder();

export function print(content: string): void;
export function print(content: string, options: StyleOptions): void;
export function print(content: string, color: BasicFgColor): void;
export function print(
  content: string,
  color: BasicFgColor,
  options: StyleOptions,
): void;

export function print(
  content: string,
  colorOrOptions?: BasicFgColor | StyleOptions,
  options?: StyleOptions,
) {
  let output = content;

  if (colorOrOptions && typeof colorOrOptions === "object") {
    output = ColorMe.fromOptions(content, colorOrOptions);
  }
  if (colorOrOptions && typeof colorOrOptions === "string") {
    output = ColorMe.fromOptions(content, {
      color: colorOrOptions,
      ...options,
    });
  }
  if (!colorOrOptions && options) {
    output = ColorMe.fromOptions(content, { color: "white", ...options });
  }
  Deno.stdout.write(encoder.encode(output));
}

export function println(content: string, color?: BasicFgColor) {
  console.log(ColorMe.fromOptions(content, { color: color || "white" }));
  // print(`${content}\n`, color);
}

export function printLines(count: number) {
  for (let i = 0; i < count; i++) {
    println("");
  }
}

export function goToTop() {
  print("\x1b[H");
}
export function goTo(row: number, column: number) {
  print(`\x1b[${row};${column}H`);
}

export function goToColumn(column: number) {
  print(`\x1b[${column}G`);
}

export function clearScreen() {
  print("\x1b[2J");
}

export function clearCurrentLine() {
  print("\x1b[2K");
}
export function clearLine(line: number, options?: {
  start: number;
  end: number;
  bgColor?: BasicBgColor;
}) {
  goTo(line, options?.start || 0);
  if (options?.end) {
    print(" ".repeat(options.end - options.start), {
      bgColor: options.bgColor,
    });
    return;
  }
  clearCurrentLine();
}

export function hideCursor() {
  console.log("\x1B[?25l");
}

export function showCursor() {
  console.log("\x1B[?25h");
}
export function clearLines(start: number, end: number) {
  for (let i = start; i <= end; i++) {
    clearLine(i);
  }
}

export function clear() {
  goToTop();
  clearScreen();
}

export const symbols = {
  block: "█",
  upArrow: "▲",
  upArrowAlt: "↑",
  downArrow: "▼",
  downArrowAlt: "↓",
  enter: "↵",
  cursor: "❯",
  cursorAlt: "❯❯",
  cursorAlt2: "❯❯❯",
  cursorAlt3: "❯❯❯❯",
  leftArrow: "◀",
  rightArrow: "▶",
  leftArrowAlt: "←",
  rightArrowAlt: "→",
  pipe: "│",
  pipeWide: "┃",
  pipeAlt: "┆",
  pipeAltWide: "┇",
  pipeAlt2: "┊",
  pipeAlt2Wide: "┋",
};

export const symbol = {
  check: "✔",
  cross: "✖",
  star: "★",
  square: "▇",
  squareSmall: "◻",
  squareSmallFilled: "◼",
  play: "▶",
  circle: "◯",
  circleFilled: "◉",
  circleDotted: "◌",
  circleDouble: "◎",
  circleCircle: "ⓞ",
  circleCross: "ⓧ",
  circlePipe: "Ⓘ",
  circleQuestionMark: "?⃝",
  bullet: "●",
  dot: "․",
  line: "─",
  ellipsis: "…",
  pointer: "❯",
  pointerSmall: "›",
  info: "ℹ",
  warning: "⚠",
  hamburger: "☰",
  smiley: "㋡",
  mustache: "෴",
  heart: "♥",
  arrowUp: "↑",
  arrowDown: "↓",
  arrowLeft: "←",
  arrowRight: "→",
  radioOn: "◉",
  radioOff: "◯",
  checkboxOn: "☒",
  checkboxOff: "☐",
  checkboxCircleOn: "ⓧ",
  checkboxCircleOff: "Ⓘ",
  questionMarkPrefix: "?⃝",
  oneHalf: "½",
  oneThird: "⅓",
  oneQuarter: "¼",
  oneFifth: "⅕",
  oneSixth: "⅙",
  oneSeventh: "⅐",
  oneEighth: "⅛",
  oneNinth: "⅑",
  oneTenth: "⅒",
  twoThirds: "⅔",
  twoFifths: "⅖",
  threeQuarters: "¾",
  threeFifths: "⅗",
  threeEighths: "⅜",
  fourFifths: "⅘",
  fiveSixths: "⅚",
  fiveEighths: "⅝",
  sevenEighths: "⅞",
  box: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    vertical: "│",
    horizontal: "─",
    verticalLeft: "┤",
    verticalRight: "├",
    horizontalDown: "┬",
    horizontalUp: "┴",
    double: {
      topLeft: "╔",
      topRight: "╗",
      bottomLeft: "╚",
      bottomRight: "╝",
      vertical: "║",
      horizontal: "═",
      verticalLeft: "╣",
      verticalRight: "╠",
      horizontalDown: "╦",
      horizontalUp: "╩",
    },
    doubleSingle: {
      topLeft: "╓",
      topRight: "╖",
      bottomLeft: "╙",
      bottomRight: "╜",
      vertical: "║",
      horizontal: "─",
      verticalLeft: "╢",
      verticalRight: "╟",
      horizontalDown: "╥",
      horizontalUp: "╨",
    },
    classic: {
      topLeft: "+",
      topRight: "+",
      bottomLeft: "+",
      bottomRight: "+",
      vertical: "|",
      horizontal: "-",
      verticalLeft: "+",
      verticalRight: "+",
      horizontalDown: "+",
      horizontalUp: "+",
    },
    thick: {
      topLeft: "┏",
      topRight: "┓",
      bottomLeft: "┗",
      bottomRight: "┛",
      vertical: "┃",
      horizontal: "━",
      verticalLeft: "┫",
      verticalRight: "┣",
      horizontalDown: "┳",
      horizontalUp: "┻",
    },
  },
  arrows: {
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
    upRight: "↗",
    upLeft: "↖",
    downRight: "↘",
    downLeft: "↙",
    altUp: "▲",
    altDown: "▼",
    altLeft: "◀",
    altRight: "▶",
    alt2Up: "⇧",
    alt2Down: "⇩",
    alt2Left: "⇦",
    alt2Right: "⇨",
    alt3Up: "⬆",
    alt3Down: "⬇",
    alt3Left: "⬅",
    alt3Right: "➡",
  },
  lit: {
    singleQuote: "‛",
    doubleQuote: "“",
    doubleQuoteAlt: "”",
    singleQuoteAlt: "’",
    backtick: "‘",
    copyWrite: "©",
    registered: "®",
    trademark: "™",
  },
  cursors: {
    block: "█",
    alt: "❯",
    alt2: "❯❯",
    alt3: "❯❯❯",
    alt4: "❯❯❯❯",
    pipe: "│",
  },
  moon: {
    new: "🌑",
    waxingCrescent: "🌒",
    firstQuarter: "🌓",
    waxingGibbous: "🌔",
    full: "🌕",
    waningGibbous: "🌖",
    lastQuarter: "🌗",
    waningCrescent: "🌘",
  },
  braile: {
    blank: "⠀",
    dot: "⣿",
    dot2: "⡷",
    dot3: "⡯",
    dot4: "⡏",
    dot5: "⠟",
    dot6: "⠻",
    dot7: "⢹",
    dot8: "⣱",
    dot9: "⣾",
    dot10: "⣽",
    dot11: "⣻",
    dot12: "⢿",
    dot13: "⡿",
    dot14: "⣟",
    dot15: "⣯",

    block: "⣤",
    block2: "⣆",
    block3: "⡆",
    block4: "⠆",
    block5: "⢆",
    block6: "⣲",
    block7: "⣴",
    block8: "⣾",
    block9: "⣷",
    block10: "⣿",
    block11: "⡿",
    block12: "⣟",
    block13: "⣯",
    block14: "⣻",
  },
};

export default {
  print,
  println,
  printLines,
  goToTop,
  goTo,
  goToColumn,
  clearScreen,
  clearCurrentLine,
  clearLine,
  hideCursor,
  showCursor,
  clearLines,
  clear,
  symbols,
  symbol,
};
