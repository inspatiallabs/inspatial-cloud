import { ObjectBase } from "../objects/objectBase.ts";
import type { Page } from "../pages/page.ts";
import type { Font } from "../resources/fonts/font.ts";
import type {
  FontDefaults,
  FontWeight,
  TextAlign,
  VerticalAlign,
} from "../resources/fonts/fontRegistry.ts";
import { helveticaWidths } from "../resources/fonts/widths.ts";
import type { Color } from "./graphics.ts";
import { parseColor } from "./utils.ts";

export class TextObject extends ObjectBase {
  #x = 0;
  #y = 0;
  #fontFamily: string = "Helvetica";
  #fontWeight: FontWeight = "normal";
  #alignX: TextAlign = "left";
  #alignY: VerticalAlign = "bottom";
  #italic: boolean = false;
  #fontSize = 12;
  #color: Color = [0, 0, 0];
  #text = "";
  get textWidth(): number {
    const font = this.getFont();
    const widths = font?.widths || helveticaWidths;
    let width = 0;
    const text = this.#text;
    if (text.length === 0) {
      return 0;
    }

    for (const char of text) {
      const charCode = char.charCodeAt(0);
      const charWidth = widths.get(charCode) || 0;
      width += charWidth;
    }
    return width / 1000 * this.#fontSize;
  }

  constructor(page: Page, fontDefaults?: FontDefaults) {
    super(page);
    if (fontDefaults) {
      this.#fontFamily = fontDefaults.family;
      this.#fontSize = fontDefaults.size;
    }
  }
  getFont(): Font | undefined {
    let fontName = this.#fontWeight === "bold" ? "F2" : "F1";
    if (this.#fontFamily && this.#fontFamily !== "Helvetica") {
      const family = this.#fontFamily
        ? this.page.getFontName(this.#fontFamily, {
          fontWeight: this.#fontWeight,
          italic: this.#italic,
        })
        : undefined;
      if (family) {
        fontName = family;
      }
    }
    const font = this.page.resources.fontRegistry.fonts.get(fontName);
    return font;
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
    const font = this.getFont();

    let lineHeight = 1097 / 1000 * this.#fontSize / 2;
    let widths = helveticaWidths;
    let fontName = this.#fontWeight === "bold" ? "F2" : "F1";
    if (font) {
      lineHeight = font.maxHeight / 1000 * this.#fontSize / 2;
      widths = font.widths;
      fontName = font.fontName;
    }

    const getStringWidth = (textLine: string) => {
      let width = 0;
      if (textLine.length === 0) return 0;
      for (const char of textLine) {
        const charCode = char.charCodeAt(0);
        const charWidth = widths.get(charCode) || 0;
        width += charWidth;
      }
      return width / 1000 * this.#fontSize;
    };
    const leading = lineHeight * 1.5 - lineHeight;
    let text = "";
    const textLines = this.#text.split("\n");
    let x = this.#x;
    let y = this.#y;
    let lastOffset = 0;
    const lineCount = textLines.length;
    const textHeight = lineHeight * lineCount + (leading * lineCount - 2);
    switch (this.#alignY) {
      case "top":
        y = y - textHeight;
        break;
      case "middle":
        y = y + ((textHeight - lineHeight) / 2) - lineHeight / 2;
        break;
      case "bottom":
        break;
    }
    textLines.forEach((textLine, _index) => {
      const textWidth = getStringWidth(textLine);
      let outText = `(${textLine})`;
      switch (this.#alignX) {
        case "center":
          x = x - (textWidth / 2) + lastOffset;
          lastOffset = textWidth / 2;
          break;
        case "right":
          x = x - textWidth;
          lastOffset = textWidth;
          break;
        case "left":
        default:
          lastOffset = 0;
          break;
      }
      if (font?.cmap) {
        outText = "";
        for (const char of textLine) {
          const code = font.cmap.get(char.charCodeAt(0));
          const byte = code?.toString(16).padStart(4, "0");
          if (!byte) continue;
          outText += byte;
        }
        outText = `<${outText}>`;
      }
      text += `${x} ${y} Td\r\n${outText} Tj\r\n`;
      y = 0 - lineHeight - leading;
      x = 0;
    });
    const lines: string[] = [];
    if (this.#color) {
      const [r, g, b] = parseColor(this.#color);
      lines.push(`${r} ${g} ${b} rg`);
    }
    lines.push(`BT`);
    // lines.push(`[1 0 0 1 ${this.#x} ${this.#y}] cm`);
    lines.push(`/${fontName} ${this.#fontSize} Tf`);
    lines.push(text);
    // lines.push(`[1 0 0 1 -${this.#x} -${this.#y}] cm`);
    lines.push("ET");
    return lines.join("\r\n") + "\r\n";
  }
}
