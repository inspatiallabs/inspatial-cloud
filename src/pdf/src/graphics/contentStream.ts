import type { DocObject } from "../objects/docObject.ts";
import type { ObjectBase } from "../objects/objectBase.ts";
import type { Page } from "../pages/page.ts";
import type { FontDefaults } from "../resources/fonts/fontRegistry.ts";
import type { CellStyle, Color, Position } from "./graphics.d.ts";
import { PathObject } from "./pathObject.ts";
import { TextObject } from "./textObject.ts";

export class ContentStream {
  fontDefaults: FontDefaults;
  docObject: DocObject;
  #page: Page;
  #raw: boolean = false;
  constructor(page: Page, contentObj: DocObject, config?: {
    fontDefaults?: FontDefaults;
  }) {
    this.#page = page;
    this.docObject = contentObj;
    this.fontDefaults = {
      family: "Helvetica",
      weight: "normal",
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
      fontWeight: this.fontDefaults.weight || 400,
      italic: this.fontDefaults.italic || false,
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
          .fontWeight(style.fontWeight)
          .fontSize(style.fontSize)
          .color(style.color);
        if (style.italic) {
          cellText.italic();
        }

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
      dashed?: {
        pattern: number[];
        phase: number;
      };
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
