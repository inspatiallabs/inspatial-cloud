import { Dictionary } from "../../objects/dictionary.ts";
import type { Font } from "./font.ts";

export type FontWeight = number | "normal" | "bold" | "light" | "extrabold";
export interface FontDefaults {
  family: string | "Helvetica" | "Times" | "Courier";
  weight?: FontWeight;
  italic?: boolean;
  size: number;
}

const builtinFonts = [{
  family: "Helvetica",
  weights: {
    400: { normal: "Helvetica", italic: "Helvetica-Oblique" },
    700: { normal: "Helvetica-Bold", italic: "Helvetica-BoldOblique" },
  },
}, {
  family: "Times",
  weights: {
    400: { normal: "Times-Roman", italic: "Times-Italic" },
    700: { normal: "Times-Bold", italic: "Times-BoldItalic" },
  },
}, {
  family: "Courier",
  weights: {
    400: { normal: "Courier", italic: "Courier-Oblique" },
    700: { normal: "Courier-Bold", italic: "Courier-BoldOblique" },
  },
}];

export class FontRegistry {
  fontDict: Dictionary;
  private families: Map<string, {
    weights: Map<number, {
      italic: string;
      normal: string;
    }>;
  }>;
  fonts: Map<string, Font>;
  readonly builtinFontNames = new Set([
    "Helvetica",
    "Helvetica-Oblique",
    "Helvetica-Bold",
    "Helvetica-BoldOblique",
    "Times-Roman",
    "Times-Italic",
    "Times-Bold",
    "Times-BoldItalic",
    "Courier",
    "Courier-Oblique",
    "Courier-Bold",
    "Courier-BoldOblique",
  ]);
  constructor() {
    this.families = new Map();
    this.fonts = new Map();
    this.fontDict = new Dictionary();
    for (const font of builtinFonts) {
      this.families.set(font.family, {
        weights: new Map(),
      });
      const family = this.families.get(font.family);
      if (!family) continue;
      for (const [weight, styles] of Object.entries(font.weights)) {
        const weightNum = parseInt(weight, 10);
        family.weights.set(weightNum, {
          italic: styles.italic,
          normal: styles.normal,
        });
      }
    }
  }
  registerFont(font: Font) {
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
  }) {
    const fontFamily = this.families.get(family);
    if (!fontFamily) return undefined;
    const weight = options?.fontWeight || "normal";
    let weightValue: number = 400;
    const italic = options?.italic || false;

    const weightMap: Record<string, number> = {
      light: 300,
      normal: 400,
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
