/** The PostScript language names of 14 Type 1 fonts, known as the standard 14 fonts */
export type StandardFont =
  | "Times-Roman"
  | "Helvetica"
  | "Courier"
  // | "Symbol"
  | "Times-Bold"
  | "Helvetica-Bold"
  | "Courier-Bold"
  // | "ZapfDingbats"
  | "Times-Italic"
  | "Helvetica-Oblique"
  | "Courier-Oblique"
  | "Times-BoldItalic"
  | "Helvetica-BoldOblique"
  | "Courier-BoldOblique";

export const fontMap: Record<StandardFont, string> = {
  Helvetica: "F1",
  "Helvetica-Bold": "F2",
  "Helvetica-Oblique": "F3",
  "Helvetica-BoldOblique": "F4",
  "Times-Roman": "F5",
  "Times-Bold": "F6",
  "Times-Italic": "F7",
  "Times-BoldItalic": "F8",
  Courier: "F9",
  "Courier-Bold": "F10",
  "Courier-Oblique": "F11",
  "Courier-BoldOblique": "F12",
};

export type FontStyle = "normal" | "bold" | "italic" | "bolditalic";
export type FontFamily = "Helvetica" | "Times" | "Courier";

export interface FontDefaults {
  family: FontFamily;
  style: FontStyle;
  size: number;
}
export const getFont = (
  family: "Helvetica" | "Times" | "Courier",
  style: FontStyle,
): StandardFont => {
  switch (family) {
    case "Helvetica":
      switch (style) {
        case "normal":
          return "Helvetica";
        case "bold":
          return "Helvetica-Bold";
        case "italic":
          return "Helvetica-Oblique";
        case "bolditalic":
          return "Helvetica-BoldOblique";
      }
      break;
    case "Times":
      switch (style) {
        case "normal":
          return "Times-Roman";
        case "bold":
          return "Times-Bold";
        case "italic":
          return "Times-Italic";
        case "bolditalic":
          return "Times-BoldItalic";
      }
      break;
    case "Courier":
      switch (style) {
        case "normal":
          return "Courier";
        case "bold":
          return "Courier-Bold";
        case "italic":
          return "Courier-Oblique";
        case "bolditalic":
          return "Courier-BoldOblique";
      }
      break;
  }
};
