import { ObjectBase } from "../objects/objectBase.ts";
import type { Page } from "../pages/page.ts";
import type {
  FontDefaults,
  FontWeight,
  TextAlign,
  VerticalAlign,
} from "../resources/fonts/fontRegistry.ts";
import type { Color } from "./graphics.d.ts";
import { parseColor } from "./utils.ts";

export class TextObject extends ObjectBase {
  #x = 0;
  #y = 0;
  #fontFamily?: string;
  #fontWeight: FontWeight = "normal";
  #alignX: TextAlign = "left";
  #alignY: VerticalAlign = "bottom";
  #italic: boolean = false;
  #fontSize = 12;
  #color: Color = [0, 0, 0];
  #text = "";
  #textWidth = 0;
  get textWidth() {
    return this.#textWidth;
  }

  constructor(page: Page, fontDefaults?: FontDefaults) {
    super(page);
    if (fontDefaults) {
      this.#fontFamily = fontDefaults.family;
      this.#fontSize = fontDefaults.size;
    }
  }
  text(text: string): typeof this {
    this.#text = text;
    return this;
  }

  position(x: number, y: number): typeof this {
    this.#x = x;
    this.#y = y;
    return this;
  }
  paragraphAlign(x: TextAlign): typeof this {
    this.#alignX = x;
    return this;
  }
  verticalAlign(y: VerticalAlign): typeof this {
    this.#alignY = y;
    return this;
  }
  fontFamily(family: string): typeof this {
    this.#fontFamily = family;
    return this;
  }
  fontWeight(
    weight: FontWeight,
  ): typeof this {
    this.#fontWeight = weight;
    return this;
  }
  italic(): typeof this {
    this.#italic = true;
    return this;
  }
  fontSize(size: number): typeof this {
    this.#fontSize = size;
    return this;
  }
  color(color: Color): typeof this {
    this.#color = color;
    return this;
  }
  generate(): string {
    const fontName = this.#fontFamily
      ? this.page.getFontName(this.#fontFamily, {
        fontWeight: this.#fontWeight,
        italic: this.#italic,
      })
      : undefined;
    if (!fontName) {
      throw new Error("Font not found");
    }
    const font = this.page.resources.fontRegistry.fonts.get(fontName);
    if (!font) {
      throw new Error("Font not found in registry");
    }
    const lineHeight = font.maxHeight / 1000 * this.#fontSize / 2;
    this.#textWidth = font.getStringWidth(this.#text, this.#fontSize);
    let x = this.#x;
    switch (this.#alignX) {
      case "center":
        x = this.#x - (this.#textWidth / 2);
        break;
      case "right":
        x = this.#x - this.#textWidth;
        break;
      case "left":
      default:
        break;
    }
    let y = this.#y;
    switch (this.#alignY) {
      case "top":
        y = this.#y - lineHeight;
        break;
      case "middle":
        y = this.#y - (lineHeight / 2);
        break;
      case "bottom":
        break;
    }

    const lines: string[] = [];
    if (this.#color) {
      const [r, g, b] = parseColor(this.#color);
      lines.push(`${r} ${g} ${b} rg`);
    }
    lines.push(`BT`);
    // lines.push(`[1 0 0 1 ${this.#x} ${this.#y}] cm`);
    lines.push(`/${fontName} ${this.#fontSize} Tf`);
    lines.push(`${x} ${y} Td`);
    lines.push(`(${this.#text}) Tj`);
    // lines.push(`[1 0 0 1 -${this.#x} -${this.#y}] cm`);
    lines.push("ET");
    return lines.join("\r\n") + "\r\n";
  }
}
