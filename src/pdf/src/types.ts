import type { FontFamily, FontStyle, StandardFont } from "./pages/fonts.ts";

export type PDFVersion =
  | "1.1"
  | "1.2"
  | "1.3"
  | "1.4"
  | "1.5"
  | "1.6"
  | "1.7"
  | "2.0";

export interface TableEntry {
  byteOffset: number;
  genNumber: number;
  inUse: boolean;
}

export interface TextOptions {
  x?: number;
  y?: number;
  fontSize?: number;
  fontFamily?: FontFamily;
  fontStyle?: FontStyle;
}
