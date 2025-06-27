import type { LineStyle } from "~/terminal/types.ts";

interface BoxLine {
  horizontal: string;
  vertical: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  verticalLeft: string;
  verticalRight: string;
  horizontalDown: string;
  horizontalUp: string;
}

type Box = Record<LineStyle, BoxLine>;

export const box: Box = {
  block: {
    horizontal: "█",
    vertical: "█",
    topLeft: "█",
    topRight: "█",
    bottomLeft: "█",
    bottomRight: "█",
    verticalLeft: "█",
    verticalRight: "█",
    horizontalDown: "█",
    horizontalUp: "█",
  },
  double: {
    horizontal: "═",
    vertical: "║",
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    verticalLeft: "╠",
    verticalRight: "╣",
    horizontalDown: "╦",
    horizontalUp: "╩",
  },
  doubleSingle: {
    horizontal: "─",
    vertical: "│",
    topLeft: "╓",
    topRight: "╖",
    bottomLeft: "╙",
    bottomRight: "╜",
    verticalLeft: "╟",
    verticalRight: "╢",
    horizontalDown: "╥",
    horizontalUp: "╨",
  },
  dotted: {
    horizontal: "⋯",
    vertical: "⋮",
    topLeft: "⋮",
    topRight: "⋮",
    bottomLeft: "⋮",
    bottomRight: "⋮",
    verticalLeft: "⋮",
    verticalRight: "⋮",
    horizontalDown: "⋮",
    horizontalUp: "⋮",
  },
  standard: {
    horizontal: "─",
    vertical: "│",
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    verticalLeft: "┤",
    verticalRight: "├",
    horizontalDown: "┬",
    horizontalUp: "┴",
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
};
