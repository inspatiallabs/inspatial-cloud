import type {
  BasicBgColor,
  BasicFgColor,
  Color256,
  ColorRGB,
} from "#utils/color-me.ts";

export type LineStyle =
  | "standard"
  | "double"
  | "thick"
  | "dotted"
  | "block"
  | "doubleSingle";

export interface Theme {
  backgroundColor: BasicBgColor;
  primaryColor: BasicFgColor;
  lineStyle: LineStyle;
}

export interface StyleOptions {
  color?: BasicFgColor | Color256 | ColorRGB;
  bgColor?: BasicBgColor | Color256 | ColorRGB;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  inverse?: boolean;
  strikethrough?: boolean;
  blink?: boolean;
}
