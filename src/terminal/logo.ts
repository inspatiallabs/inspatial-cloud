import ColorMe, {
  type BasicBgColor,
  type BasicFgColor,
} from "#terminal/color-me.ts";
import { symbols } from "#terminal/print-utils.ts";
import { center } from "#terminal/format-utils.ts";

const big = [
  [27, 10, 27],
  [24, 16, 24],
  [21, 23, 20],
  [18, 29, 17],
  [19, 31, 14],
  [11, 6, 6, 26, 15],
  [8, 5, 2, 5, 6, 20, 5, 6, 7],
  [5, 5, 8, 6, 5, 14, 5, 12, 4],
  [3, 4, 14, 6, 5, 8, 5, 6, 7, 4, 2],
  [1, 3, 19, 6, 5, 2, 5, 6, 13, 3, 1],
  [1, 3, 23, 5, 7, 5, 16, 3, 1],
  [1, 3, 20, 6, 5, 6, 20, 2, 1],
  [1, 3, 17, 6, 5, 6, 23, 2, 1],
  [1, 3, 14, 6, 5, 5, 27, 2, 1],
  [1, 3, 10, 6, 6, 5, 30, 2, 1],
  [1, 3, 7, 6, 5, 6, 33, 2, 1],
  [1, 3, 4, 5, 5, 6, 37, 2, 1],
  [1, 8, 5, 6, 26, 2, 13, 2, 1],
  [1, 3, 6, 5, 28, 5, 13, 2, 1],
  [6, 6, 27, 9, 13, 2, 1],
  [3, 6, 27, 6, 3, 3, 13, 2, 1],
  [1, 5, 27, 5, 6, 4, 13, 2, 1],
  [1, 3, 26, 5, 6, 6, 14, 2, 1],
  [1, 3, 22, 5, 6, 7, 17, 2, 1],
  [1, 3, 19, 5, 6, 7, 20, 2, 1],
  [1, 3, 15, 5, 6, 7, 22, 4, 1],
  [3, 4, 6, 7, 6, 6, 26, 4, 2],
  [5, 11, 6, 6, 26, 6, 4],
  [6, 5, 7, 6, 26, 6, 8],
  [15, 6, 27, 6, 10],
  [13, 6, 25, 6, 14],
  [17, 6, 18, 6, 17],
  [20, 7, 11, 6, 20],
  [24, 6, 5, 6, 23],
  [27, 10, 27],
];

const firstBlack = [6, 18, 19, 28, 29];
const secondBlack = [
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
];

type Symbol = keyof typeof symbols;
const thirdBlack = [7, 8, 9, 10];
export function makeLogo(options: {
  symbol: Symbol;
  fillSymbol: Symbol;
  blankSymbol: Symbol;
  bgColor: BasicBgColor;
  fillColor: BasicFgColor;
  blankColor: BasicFgColor;
  outlineColor: BasicFgColor;
}): string {
  const content = big;
  const {
    bgColor,
    fillColor,
    outlineColor,
    blankColor,
    blankSymbol,
    symbol,
    fillSymbol,
  } = options;
  const char = symbols[symbol];
  const outlineChar = symbols[symbol];
  const fillerChar = symbols[fillSymbol];
  const blankChar = symbols[blankSymbol];
  let currentRow = 0;
  const formattedRows = [];
  for (const row of content) {
    currentRow++;
    const colored = ColorMe.chain().bgColor(bgColor);
    row.forEach((count, index) => {
      if (index % 2 === 1) {
        colored.content(outlineChar.repeat(count)).color(outlineColor);
        return;
      }

      let currentColor: BasicFgColor = fillColor;
      let currentChar = fillerChar;

      switch (index) {
        case 0:
        case row.length - 1:
          currentColor = blankColor;
          currentChar = blankChar;
          break;
        case 2:
          if (firstBlack.includes(currentRow)) {
            currentColor = blankColor;
            currentChar = blankChar;
          }
          break;
        case 4:
          if (secondBlack.includes(currentRow)) {
            currentColor = blankColor;
            currentChar = blankChar;
          }
          break;
        case 6:
          if (thirdBlack.includes(currentRow)) {
            currentColor = blankColor;
            currentChar = blankChar;
          }
          break;
      }
      colored.content(currentChar.repeat(count));
      colored.color(currentColor);
    });
    formattedRows.push(
      center(colored.end()),
    );
  }
  return formattedRows.join("\n");
}
