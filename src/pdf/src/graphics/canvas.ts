import {
  type FontDefaults,
  type FontFamily,
  fontMap,
  type FontStyle,
  getFont,
} from "../pages/fonts.ts";
import type { Page } from "../pages/page.ts";

abstract class ObjectBase {
  page: Page;
  constructor(page: Page) {
    this.page = page;
  }
  abstract generate(): string;
}
type HexColor = `#${string}`;
type RGBColor = [number, number, number]; // Each value between 0 and 1
type Color = HexColor | RGBColor;
type Justify = "start" | "center" | "end";
type Align = "top" | "middle" | "bottom";

interface Position {
  x: number | Justify;
  y: number | Align;
}
function parseColor(color: HexColor | RGBColor): [number, number, number] {
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
export class PathObject extends ObjectBase {
  content: Array<string> = [];
  moveTo(x: number, y: number): typeof this {
    this.content.push(`${x} ${y} m\r\n`);
    return this;
  }
  lineTo(x: number, y: number): typeof this {
    this.content.push(`${x} ${y} l\r\n`);
    return this;
  }
  curveTo(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ): typeof this {
    this.content.push(`${x1} ${y1} ${x2} ${y2} ${x3} ${y3} c\r\n`);
    return this;
  }
  closePath(): typeof this {
    this.content.push(`h\r\n`);
    return this;
  }
  stroke(): typeof this {
    this.content.push(`S\r\n`);
    return this;
  }
  setFillColor(color: Color): typeof this {
    const [r, g, b] = parseColor(color);
    this.content.push(`${r} ${g} ${b} rg\r\n`);
    return this;
  }
  setStrokeColor(color: Color): typeof this {
    const [r, g, b] = parseColor(color);
    this.content.push(`${r} ${g} ${b} RG\r\n`);
    return this;
  }
  fill(): typeof this {
    this.content.push(`f\r\n`);
    return this;
  }
  fillAndStroke(): typeof this {
    this.content.push(`B\r\n`);
    return this;
  }
  endPath(): typeof this {
    this.content.push(`n\r\n`);
    return this;
  }
  setLineWidth(width: number): typeof this {
    this.content.push(`${width} w\r\n`);
    return this;
  }
  setLineCap(style: 0 | 1 | 2): typeof this {
    this.content.push(`${style} J\r\n`);
    return this;
  }
  setLineJoin(style: 0 | 1 | 2): typeof this {
    this.content.push(`${style} j\r\n`);
    return this;
  }
  setMiterLimit(limit: number): typeof this {
    this.content.push(`${limit} M\r\n`);
    return this;
  }
  setDashPattern(pattern: number[], phase: number): typeof this {
    const patternStr = pattern.length > 0 ? pattern.join(" ") : "[]";
    this.content.push(`${patternStr} ${phase} d\r\n`);
    return this;
  }
  generate(): string {
    return this.content.join("");
  }
  $drawCircle(config: {
    center: Position;
    radius: number;
    border?: {
      width?: number;
      color?: Color;
    };
    fill?: {
      color?: Color;
    };
  }) {
    const { center, radius, border, fill } = config;
    const k = 0.552284749831; // Approximation for control point offset
    const ox = radius * k; // Control point offset horizontal
    const oy = radius * k; // Control point offset vertical
    let x: number;
    let y: number;
    switch (center.x) {
      case "start":
        x = radius;
        break;
      case "center":
        x = this.page?.pageSize.width / 2 || 0;
        break;
      case "end":
        x = (this.page?.pageSize.width || 0) - radius;
        break;
      default:
        x = center.x;
    }
    switch (center.y) {
      case "top":
        y = (this.page?.pageSize.height || 0) - radius;
        break;
      case "middle":
        y = (this.page?.pageSize.height || 0) / 2;
        break;
      case "bottom":
        y = radius;
        break;
      default:
        y = center.y;
    }

    if (fill?.color) {
      this.setFillColor(fill.color);
      this.moveTo(x + radius, y);
      this.curveTo(x + radius, y + oy, x + ox, y + radius, x, y + radius);
      this.curveTo(x - ox, y + radius, x - radius, y + oy, x - radius, y);
      this.curveTo(x - radius, y - oy, x - ox, y - radius, x, y - radius);
      this.curveTo(x + ox, y - radius, x + radius, y - oy, x + radius, y);
      this.closePath();
      this.fill();
    }
    if (border?.color && border?.width) {
      this.setStrokeColor(border.color);
      this.setLineWidth(border.width);
      this.moveTo(x + radius, y);
      this.curveTo(x + radius, y + oy, x + ox, y + radius, x, y + radius);
      this.curveTo(x - ox, y + radius, x - radius, y + oy, x - radius, y);
      this.curveTo(x - radius, y - oy, x - ox, y - radius, x, y - radius);
      this.curveTo(x + ox, y - radius, x + radius, y - oy, x + radius, y);
      this.closePath();
      this.stroke();
    }
    return this;
  }
  $drawBox(config: {
    size: {
      width: number;
      height: number;
    };
    position: { x: number; y: number };
    border?: {
      width?: number;
      color?: Color;
    };
    fill?: {
      color?: Color;
    };
  }) {
    const { size, position, border, fill } = config;
    if (fill?.color) {
      this.setFillColor(fill.color);
      this.moveTo(position.x, position.y);
      this.lineTo(position.x + size.width, position.y);
      this.lineTo(position.x + size.width, position.y + size.height);
      this.lineTo(position.x, position.y + size.height);
      this.closePath();
      this.fill();
    }
    if (border?.color && border?.width) {
      this.setStrokeColor(border.color);
      this.setLineWidth(border.width);
      this.moveTo(position.x, position.y);
      this.lineTo(position.x + size.width, position.y);
      this.lineTo(position.x + size.width, position.y + size.height);
      this.lineTo(position.x, position.y + size.height);
      this.closePath();
      this.stroke();
    }
    return this;
  }
}

export class TextObject extends ObjectBase {
  #x = 0;
  #y = 0;
  #fontFamily: FontFamily = "Helvetica";
  #fontStyle: FontStyle = "normal";
  #fontSize = 12;
  #color: Color = [0, 0, 0];
  #text = "";
  constructor(page: Page, fontDefaults?: FontDefaults) {
    super(page);
    if (fontDefaults) {
      this.#fontFamily = fontDefaults.family;
      this.#fontStyle = fontDefaults.style;
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

  fontFamily(family: FontFamily): typeof this {
    this.#fontFamily = family;
    return this;
  }
  fontStyle(style: FontStyle): typeof this {
    this.#fontStyle = style;
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
    const fontName = getFont(this.#fontFamily, this.#fontStyle);
    const font = fontMap[fontName];
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

export class XObject extends ObjectBase {
  generate(): string {
    return "";
  }
}

export class InlineImageObject extends ObjectBase {
  generate(): string {
    return "";
  }
}

export class ShadingObject extends ObjectBase {
  generate(): string {
    return "";
  }
}
interface TableOptions {
  rowData: Array<Array<string>>;
  columns: Array<{ name: string }>;
}
interface CellStyle {
  fontFamily?: FontFamily;
  fontStyle?: FontStyle;
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
export class ContentStream {
  fontDefaults: FontDefaults;
  #page: Page;
  constructor(page: Page, config?: {
    fontDefaults?: FontDefaults;
  }) {
    this.#page = page;
    this.fontDefaults = {
      family: "Helvetica",
      style: "normal",
      size: 12,
      ...config?.fontDefaults,
    };
  }
  contents: Array<ObjectBase> = [];
  addGrid(config: {
    rows: number;
    cols: number;
  }) {
    const { rows, cols } = config;
    const { width, height } = this.#page.pageSize;
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    const path = this.addPath();
    path.setStrokeColor("#000000").setLineWidth(0.5);
    for (let r = 0; r <= rows; r++) {
      const y = r * cellHeight;
      path.moveTo(0, y).lineTo(width, y);
    }
    for (let c = 0; c <= cols; c++) {
      const x = c * cellWidth;
      path.moveTo(x, 0).lineTo(x, height);
    }
    path.stroke();
    return this;
  }
  addRow(content: Array<string>, config: {
    cols: number;
    cellPadding?: number;
    rowHeight: number;
    border?: {
      width?: number;
      color?: Color;
    };
    fill?: {
      color?: Color;
    };
  }) {}
  addTable(config: {
    rowData: Array<Array<string>>;
    columns: Array<
      {
        name: string;
      } & CellStyle
    >;
    cellStyle: CellStyle;
    headerStyle?: CellStyle;
    maxWidth?: number | string;
    paddingTop?: number | string;
  }) {
    const { rowData, columns } = config;
    let paddingTop = 0;
    if (typeof config.paddingTop === "number") {
      paddingTop = config.paddingTop;
    } else if (
      typeof config.paddingTop === "string" &&
      config.paddingTop.endsWith("%")
    ) {
      const percent = parseFloat(config.paddingTop.slice(0, -1));
      if (!isNaN(percent) && percent > 0 && percent <= 100) {
        paddingTop = (this.#page.pageSize.height * percent) / 100;
      }
    }
    const defaultStyle: Required<CellStyle> = {
      fontFamily: this.fontDefaults.family,
      fontStyle: this.fontDefaults.style,
      fontSize: this.fontDefaults.size,
      color: [0, 0, 0] as Color,
      align: "middle",
      justify: "center",
      paddingX: 2,
      paddingY: 2,
      borderColor: "#000000" as Color,
      borderWidth: 1,
      fillColor: "#ffffff" as Color,
    };
    const headerStyle: Required<CellStyle> = {
      ...defaultStyle,
      ...config.headerStyle,
    };
    const cellStyle: Required<CellStyle> = {
      ...defaultStyle,
      ...config.cellStyle,
    };
    let tableWidth = this.#page.pageSize.width;
    if (typeof config.maxWidth === "number") {
      tableWidth = Math.min(config.maxWidth, this.#page.pageSize.width);
    } else if (
      typeof config.maxWidth === "string" && config.maxWidth.endsWith("%")
    ) {
      const percent = parseFloat(config.maxWidth.slice(0, -1));
      if (!isNaN(percent) && percent > 0 && percent <= 100) {
        tableWidth = this.#page.pageSize.width * (percent / 100);
      }
    }

    const startX = (this.#page.pageSize.width - tableWidth) / 2;
    let startY = this.#page.pageSize.height - paddingTop;
    const rowCount = rowData.length + 1; // +1 for header

    const colWidth = tableWidth / columns.length;

    for (let r = 0; r < rowCount; r++) {
      const row = r === 0 ? columns.map((c) => c.name) : rowData[r - 1];
      const padding = r === 0 ? headerStyle.paddingY : cellStyle.paddingY;
      const fontSize = r === 0 ? headerStyle.fontSize : cellStyle.fontSize;
      const rowHeight = fontSize + padding * 2;
      const cellBottom = startY;
      const cellTop = startY - rowHeight;
      const borderWidth = r === 0
        ? headerStyle.borderWidth
        : cellStyle.borderWidth;
      const borderColor = r === 0
        ? headerStyle.borderColor
        : cellStyle.borderColor;
      const fillColor = r === 0 ? headerStyle.fillColor : cellStyle.fillColor;
      for (let c = 0; c < columns.length; c++) {
        const cellX = startX + c * colWidth;
        const path = this.addPath();
        path.setStrokeColor(borderColor).setLineWidth(borderWidth).setFillColor(
          fillColor,
        );
        path.moveTo(cellX, cellTop)
          .lineTo(cellX + colWidth, cellTop)
          .lineTo(cellX + colWidth, cellBottom)
          .lineTo(cellX, cellBottom)
          .lineTo(cellX, cellTop)
          .fillAndStroke();

        const cellText = this.addText(row[c]);
        let style: Required<CellStyle> = {
          ...cellStyle,
          ...columns[c],
        };
        if (r === 0) {
          style = headerStyle;
        }
        cellText.fontFamily(style.fontFamily)
          .fontStyle(style.fontStyle)
          .fontSize(style.fontSize)
          .color(style.color);

        const position = {
          x: cellX + style.paddingX,
          y: cellBottom / 2 - style.fontSize / 4,
        };

        switch (style.align) {
          case "top":
            position.y = cellBottom - style.paddingY - style.fontSize;
            break;
          case "middle":
            position.y = cellTop + (rowHeight - style.fontSize) / 2 +
              (fontSize / 4);
            break;
          case "bottom":
            position.y = cellTop + style.paddingY;
            break;
        }
        cellText.position(position.x, position.y);
      }
      startY -= rowHeight;
    }

    return this;
  }
  addCircle(config: {
    center: Position;
    radius: number;
    border?: {
      width?: number;
      color?: Color;
    };
    fill?: {
      color?: Color;
    };
  }) {
    const path = this.addPath();
    path.$drawCircle(config);
    return this;
  }
  addPath(): PathObject {
    const path = new PathObject(this.#page);
    this.contents.push(path);
    return path;
  }
  addText(textContent: string): TextObject {
    const text = new TextObject(this.#page, this.fontDefaults);
    text.text(textContent);
    this.contents.push(text);
    return text;
  }
  addXObject(): XObject {
    const xobj = new XObject(this.#page);
    this.contents.push(xobj);
    return xobj;
  }
  addInlineImage(): InlineImageObject {
    const img = new InlineImageObject(this.#page);
    this.contents.push(img);
    return img;
  }
  addShading(): ShadingObject {
    const shading = new ShadingObject(this.#page);
    this.contents.push(shading);
    return shading;
  }

  generate(): {
    bytes: Uint8Array;
    length: number;
  } {
    const encoder = new TextEncoder();
    const contentArray: Array<string> = [
      "q\r\n", // Save graphics state
    ];

    for (const obj of this.contents) {
      contentArray.push(obj.generate());
    }

    contentArray.push("Q\r\n"); // Restore graphics state
    console.log({ contentArray });
    const contents = encoder.encode(contentArray.join(""));
    const contentLength = contents.length;
    const start = encoder.encode("stream\r\n");
    const end = encoder.encode("endstream\r\n");

    return {
      bytes: new Uint8Array([...start, ...contents, ...end]),
      length: contentLength,
    };
  }
}
/*
CategoryOperatorsLocation
General graphics statew, J, j, M, d, ri, i, gs, q, Q"Table 56 — Graphics state operators"
Special graphics statecm"Table 56 — Graphics state operators"
Path constructionm, l, c, v, y, h, re"Table 58 — Path construction operators"
Path paintingS, s, f, F, f*, B, B*, b, b*, n"Table 59 — Path-painting operators"
Clipping pathsW, W*"Table 60 — Clipping path operators"
Text objectsBT, ET"Table 105 — Text object operators"
Text stateTc, Tw, Tz, TL, Tf, Tr, Ts"Table 103 — Text state operators"
Text positioningTd, TD, Tm, T*"Table 106 — Text-positioning operators"
Text showingTj, TJ, ', ""Table 107 — Text-showing operators"
Type 3 fontsd0, d1"Table 111 — Type 3 font operators"
ColourCS, cs, SC, SCN, sc, scn, G, g,
RG, rg, K, k"Table 73 — Colour operators"
Shading patternsSh"Table 76 — Shading operator"
Inline imagesBI, ID, EI"Table 90 — Inline image operators"
XObjectsDo"Table 86 — XObject operator"
Marked-contentMP, DP, BMC, BDC, EMC"Table 351 — Entries in a data dictionary"
CompatibilityBX, EX"Table 33 — Compatibility operators"
*/
