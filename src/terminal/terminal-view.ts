import type { LineStyle, StyleOptions, Theme } from "#terminal/types.ts";
import { box } from "#terminal/box.ts";
import { Terminal } from "#terminal/terminal.ts";

import { center } from "#terminal/format-utils.ts";

export class TerminalView {
  theme: Theme;
  cursorPosition: { row: number; column: number } = { row: 0, column: 0 };
  padChar = " ";
  title: string = "";
  constructor(options?: {
    title?: string;
  }) {
    this.theme = {
      backgroundColor: "bgBlack",
      primaryColor: "brightMagenta",
      lineStyle: "thick",
    };
    this.title = options?.title || "";
  }
  start() {
    // await asyncPause(500);
    this.clearView();
    this.setTitle(this.title);
  }

  get consoleSize(): {
    columns: number;
    rows: number;
  } {
    try {
      return Deno.consoleSize();
    } catch (_e) {
      return { columns: 80, rows: 20 };
    }
  }
  get height(): number {
    return this.consoleSize.rows;
  }
  init() {
    Terminal.clear();
    Terminal.goToTop();
  }
  clearView(): void {
    Terminal.clear();
    Terminal.goToTop();
    const height = this.height;
    for (let i = 0; i < height; i++) {
      Terminal.goTo(i, 0);
      Terminal.clearCurrentLine();
    }
  }
  drawBox(options: {
    width: number;
    height: number;
    startRow: number;
    startColumn: number;
    lineStyle?: LineStyle;
  }) {
    const style = options.lineStyle || this.theme.lineStyle;
    const { width, height, startRow, startColumn } = options;
    const endRow = startRow + height;
    const endColumn = startColumn + width;

    const top = box[style].horizontal.repeat(width - 2);
    const bottom = box[style].horizontal.repeat(width - 2);

    const printSection = (content: string) => {
      this.print(content, {
        color: this.theme.primaryColor,
      });
    };

    Terminal.goTo(startRow, startColumn);

    printSection(box[style].topLeft + top + box[style].topRight);
    for (let i = startRow + 2; i < endRow; i++) {
      Terminal.goTo(i, startColumn);
      printSection(box[style].vertical);
      Terminal.goTo(i, endColumn);
      printSection(box[style].vertical);
    }
    Terminal.goTo(endRow, startColumn);
    printSection(box[style].bottomLeft + bottom + box[style].bottomRight);
  }
  printRaw(content: string) {
    Terminal.write(content);
  }
  print(content: string, options?: StyleOptions) {
    options = {
      bgColor: this.theme.backgroundColor,
      ...options,
    };
    Terminal.print(content, options);
  }
  setRowContent(
    row: number,
    content: string,
    offset: number = 0,
  ) {
    Terminal.goTo(row, offset);
    Terminal.clearCurrentLine();
    // const { columns } = this.consoleSize;
    // const paddedContent = content.padEnd(columns, this.padChar);
    Terminal.write(content);
  }
  setTitle(title: string) {
    Terminal.goToTop();
    Terminal.write(center(title, box.thick.horizontal, {
      color: this.theme.primaryColor,
    }));
  }
}
