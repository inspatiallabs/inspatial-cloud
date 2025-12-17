import { Dictionary } from "../../objects/dictionary.ts";
import type { Font } from "./font.ts";

export type FontWeight = number | "normal" | "bold" | "light" | "extrabold";
export type TextAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "middle" | "bottom";
export interface FontDefaults {
  family: string;
  weight?: FontWeight;
  italic?: boolean;
  size: number;
}

export class FontRegistry {
  fontDict: Dictionary;
  families: Map<string, {
    weights: Map<number, {
      italic: string;
      normal: string;
    }>;
  }>;
  fonts: Map<string, Font>;
  constructor() {
    this.families = new Map();
    this.fonts = new Map();
    this.fontDict = new Dictionary();
  }
  registerFont(font: Font): void {
    if (!font.fontFamily) {
      throw new Error("Font must have a family name");
    }
    if (!this.families.has(font.fontFamily)) {
      this.families.set(font.fontFamily, {
        weights: new Map(),
      });
    }
    const family = this.families.get(font.fontFamily);
    if (!family) return;
    if (!family.weights.has(font.fontWeight)) {
      family.weights.set(font.fontWeight, {
        italic: "",
        normal: "",
      });
    }
    const weightEntry = family.weights.get(font.fontWeight);
    if (!weightEntry) return;
    if (font.italic) {
      weightEntry.italic = font.fontName;
    } else {
      weightEntry.normal = font.fontName;
    }
    family.weights.set(font.fontWeight, weightEntry);
    this.fonts.set(font.fontName, font);
    this.fontDict.addReference(font.fontName, font.fontObject.objNumber);
  }
  getFontName(family: string, options?: {
    fontWeight?: FontWeight;
    italic?: boolean;
  }): string | undefined {
    const fontFamily = this.families.get(family);
    if (!fontFamily) return undefined;
    const weight = options?.fontWeight || "normal";
    let weightValue: number = 400;
    const italic = options?.italic || false;

    const weightMap: Record<string, number> = {
      light: 300,
      normal: 400,
      medium: 500,
      bold: 700,
      extrabold: 800,
    };
    switch (typeof weight) {
      case "undefined":
        weightValue = 400;
        break;
      case "string":
        weightValue = weightMap[weight.toLowerCase()] || 400;
        break;
      case "number":
        weightValue = weight;
        break;
    }

    const weights = Array.from(fontFamily.weights.keys()).sort((a, b) => a - b);
    let selectedWeight = weights[0];
    for (const w of weights) {
      if (w <= weightValue) {
        selectedWeight = w;
      } else {
        break;
      }
    }
    const font = fontFamily.weights.get(selectedWeight);
    if (!font) return undefined;
    return italic ? font.italic : font.normal;
  }
}
