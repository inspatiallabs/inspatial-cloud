import { ObjectBase } from "../objects/objectBase.ts";
import type { Page } from "../pages/page.ts";
import type {
  FontDefaults,
  FontWeight,
} from "../resources/fonts/fontRegistry.ts";
import type { Color } from "./graphics.d.ts";
import { parseColor } from "./utils.ts";

export class TextObject extends ObjectBase {
  #x = 0;
  #y = 0;
  #fontFamily: string = "Helvetica";
  #fontWeight: FontWeight = "normal";
  #italic: boolean = false;
  #fontSize = 12;
  #color: Color = [0, 0, 0];
  #text = "";
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
    const font = this.page.getFontName(this.#fontFamily, {
      fontWeight: this.#fontWeight,
      italic: this.#italic,
    });
    // const fontName = getFont(this.#fontFamily, this.#fontStyle);
    // const font = fontMap[fontName] || fontName;
    const content = `${
      this.#color
        ? (() => {
          const [r, g, b] = parseColor(this.#color);
          return `${r} ${g} ${b} rg\r\n`;
        })()
        : ""
    }` +
      `BT \r\n  /${font} ${this.#fontSize} Tf\r\n  ${this.#x} ${this.#y} Td\r\n  (${this.#text}) Tj\r\nET\r\n`;
    return content;
  }
}
