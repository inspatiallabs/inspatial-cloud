import type { HexColor, RGBColor } from "./graphics.ts";

export function parseColor(
  color: HexColor | RGBColor,
): [number, number, number] {
  if (Array.isArray(color)) {
    return color;
  } else if (typeof color === "string" && color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    return [r, g, b];
  }
  throw new Error("Invalid color format");
}
