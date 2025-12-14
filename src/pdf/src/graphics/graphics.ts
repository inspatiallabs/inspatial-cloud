export type HexColor = `#${string}`;
export type RGBColor = [number, number, number]; // Each value between 0 and 1
export type Color = HexColor | RGBColor;
export type Justify = "start" | "center" | "end";
export type Align = "top" | "middle" | "bottom";
export interface Position {
  x: number | Justify;
  y: number | Align;
}

export interface CellStyle {
  fontFamily?: string;
  fontWeight?: number | "normal" | "bold" | "light" | "extrabold";
  italic?: boolean;
  fontSize?: number;
  color?: Color;
  align?: Align;
  justify?: Justify;
  paddingX?: number;
  paddingY?: number;
  borderWidth?: number;
  borderColor?: Color;
  fillColor?: Color;
}
