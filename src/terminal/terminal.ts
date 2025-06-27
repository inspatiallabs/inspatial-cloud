import {
  type BasicFgColor,
  ColorMe,
  type StyleOptions,
} from "~/terminal/color-me.ts";

export class Terminal {
  static write(content: string) {
    const encoder = new TextEncoder();
    Deno.stdout.write(encoder.encode(content));
  }
  static print(
    content: string,
    colorOrOptions?: BasicFgColor | StyleOptions,
    options?: StyleOptions,
  ) {
    let output = content;

    if (colorOrOptions && typeof colorOrOptions === "object") {
      output = ColorMe.fromOptions(content, colorOrOptions);
    }
    if (colorOrOptions && typeof colorOrOptions === "string") {
      output = ColorMe.fromOptions(content, {
        color: colorOrOptions,
        ...options,
      });
    }
    if (!colorOrOptions && options) {
      output = ColorMe.fromOptions(content, { color: "white", ...options });
    }
    this.write(output);
  }
  static goToTop() {
    this.write("\x1b[H");
  }
  static goTo(row: number, column: number) {
    this.write(`\x1b[${row};${column}H`);
  }
  static goToColumn(column: number) {
    this.write(`\x1b[${column}G`);
  }
  static clear() {
    this.write("\x1b[2J");
  }
  static clearCurrentLine() {
    this.write("\x1b[2K");
  }
  static hideCursor() {
    this.write("\x1b[?25l");
  }
  static showCursor() {
    this.write("\x1b[?25h");
  }
}
