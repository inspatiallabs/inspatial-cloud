export class ColorMe {
  private mode: "chain" | "standard";

  private colorMode: "rgb" | "256" | "basic";

  private styleOptions: StyleOptions = {
    color: "white",
    bold: false,
    italic: false,
    dim: false,
    underline: false,
    inverse: false,
    strikethrough: false,
  };
  private _contentArray: string[] = [];
  private currentContentIndex = -1;
  private constructor(options?: {
    mode: "chain" | "standard";
    colorMode: "rgb" | "256" | "basic";
  }) {
    this.mode = options?.mode || "standard";
    this.colorMode = options?.colorMode || "basic";
  }

  static chain(colorMode?: "rgb" | "256" | "basic"): ColorMe {
    return new ColorMe({
      mode: "chain",
      colorMode: colorMode || "basic",
    });
  }

  static fromOptions(content: string, options: StyleOptions): string {
    const colorMe = new ColorMe({ mode: "standard", colorMode: "basic" });
    colorMe.content(content);
    for (const [key, value] of Object.entries(options)) {
      if (value) {
        colorMe[key as keyof StyleOptions](value);
      }
    }
    return colorMe.end();
  }
  static standard(colorMode?: "rgb" | "256" | "basic"): ColorMe {
    return new ColorMe({
      mode: "standard",
      colorMode: colorMode || "basic",
    });
  }

  content(content: string): ColorMe {
    if (this.currentContentIndex >= 0) {
      this._contentArray[this.currentContentIndex] = this.format();
    }
    if (this.mode === "standard") {
      this.reset();
    }
    this._contentArray.push(content);
    this.currentContentIndex++;
    return this;
  }
  color(color: BasicFgColor | Color256 | ColorRGB): ColorMe {
    this.styleOptions.color = color;
    return this;
  }
  bgColor(color: BasicBgColor | Color256 | ColorRGB): ColorMe {
    this.styleOptions.bgColor = color;
    return this;
  }
  bold(bold = true): ColorMe {
    this.styleOptions.bold = bold;
    return this;
  }
  italic(italic = true): ColorMe {
    this.styleOptions.italic = italic;
    return this;
  }

  underline(underline = true): ColorMe {
    this.styleOptions.underline = underline;
    return this;
  }
  inverse(inverse = true): ColorMe {
    this.styleOptions.inverse = inverse;
    return this;
  }
  strikethrough(strikethrough = true): ColorMe {
    this.styleOptions.strikethrough = strikethrough;
    return this;
  }
  blink(): ColorMe {
    this.styleOptions.blink = true;
    return this;
  }
  dim(dim = true): ColorMe {
    this.styleOptions.dim = dim;
    return this;
  }
  reset(): ColorMe {
    this.styleOptions = {
      color: "white",
      bold: false,
      italic: false,
      underline: false,
      dim: false,
      inverse: false,
      strikethrough: false,
    };
    return this;
  }

  private getBgColorCode(color?: BasicBgColor | Color256 | ColorRGB): string {
    if (!color) {
      return "";
    }
    if (typeof color === "string" && color.startsWith("bg")) {
      return basicBgColors[color as BasicBgColor] || "40";
    }
    switch (this.colorMode) {
      case "basic":
        if (typeof color !== "string") {
          throw new Error("Color must be a string in basic mode");
        }
        return basicBgColors[color as BasicBgColor] || "40";
      case "256":
        if (typeof color !== "number") {
          throw new Error("Color must be a number in 256 mode");
        }
        if (color < 0 || color > 255) {
          throw new Error("Color must be between 0 and 255 in 256 mode");
        }
        return `48;5;${color}`;
      case "rgb": {
        if (!Array.isArray(color)) {
          throw new Error("Color must be an array in rgb mode");
        }
        if (color.length !== 3) {
          throw new Error("Color must be an array of length 3 in rgb mode");
        }
        if (color.some((c) => c < 0 || c > 255)) {
          throw new Error(
            "Color must be an array of numbers between 0 and 255 in rgb mode",
          );
        }
        const [r, g, b] = color as ColorRGB;
        return `48;2;${r};${g};${b}`;
      }
    }
  }
  private getColorCode(color?: BasicFgColor | Color256 | ColorRGB): string {
    if (!color) {
      return "";
    }
    switch (this.colorMode) {
      case "basic":
        if (typeof color !== "string") {
          throw new Error("Color must be a string in basic mode");
        }
        return basicFgColors[color as BasicFgColor] || "37";
      case "256":
        if (typeof color !== "number") {
          throw new Error("Color must be a number in 256 mode");
        }
        if (color < 0 || color > 255) {
          throw new Error("Color must be between 0 and 255 in 256 mode");
        }
        return `38;5;${color}`;
      case "rgb": {
        if (!Array.isArray(color)) {
          throw new Error("Color must be an array in rgb mode");
        }
        if (color.length !== 3) {
          throw new Error("Color must be an array of length 3 in rgb mode");
        }
        if (color.some((c) => c < 0 || c > 255)) {
          throw new Error(
            "Color must be an array of numbers between 0 and 255 in rgb mode",
          );
        }
        const [r, g, b] = color as ColorRGB;
        return `38;2;${r};${g};${b}`;
      }
    }
  }
  private getAnsiCode(): string {
    const colorCode = this.getColorCode(this.styleOptions.color);
    const bgColorCode = this.getBgColorCode(this.styleOptions.bgColor);

    let output: string = "";
    const prefix = "\x1b[";
    if (colorCode) {
      output += `${prefix}${colorCode}m`;
    }
    if (bgColorCode) {
      output += `${prefix}${bgColorCode}m`;
    }
    for (const [key, value] of Object.entries(this.styleOptions)) {
      if (value && key !== "color" && key !== "bgColor") {
        output += `${prefix}${basicStyles[key as BasicStyle]}m`;
      }
    }
    return output;
  }
  format(): string {
    const content = this._contentArray[this.currentContentIndex];
    const ansiCode = this.getAnsiCode();

    if (this.mode === "chain") {
      return `${ansiCode}${content}`;
    }

    return `${ansiCode}${content}\x1b[0m`;
  }
  end(noClear?: boolean): string {
    this._contentArray[this.currentContentIndex] = this.format();
    const clear = "\x1b[0m";
    return this._contentArray.join("") + (noClear ? "" : clear);
  }
}

export interface StyleOptions {
  color?: BasicFgColor | Color256 | ColorRGB;
  bgColor?: BasicBgColor | Color256 | ColorRGB;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  inverse?: boolean;
  strikethrough?: boolean;
  blink?: boolean;
}

const basicFgColors = {
  black: "30",
  red: "31",
  green: "32",
  yellow: "33",
  blue: "34",
  magenta: "35",
  cyan: "36",
  white: "37",
  brightBlack: "90",
  brightRed: "91",
  brightGreen: "92",
  brightYellow: "93",
  brightBlue: "94",
  brightMagenta: "95",
  brightCyan: "96",
  brightWhite: "97",
};

const basicBgColors = {
  bgBlack: "40",
  bgRed: "41",
  bgGreen: "42",
  bgYellow: "43",
  bgBlue: "44",
  bgMagenta: "45",
  bgCyan: "46",
  bgWhite: "47",
  bgBrightBlack: "100",
  bgBrightRed: "101",
  bgBrightGreen: "102",
  bgBrightYellow: "103",
  bgBrightBlue: "104",
  bgBrightMagenta: "105",
  bgBrightCyan: "106",
  bgBrightWhite: "107",
};

const basicStyles = {
  reset: "0",
  bold: "1",
  dim: "2",
  italic: "3",
  underline: "4",
  blink: "5",
  reverse: "7",
  hidden: "8",
  strikethrough: "9",
};

export type BasicFgColor = keyof typeof basicFgColors;

export type BasicBgColor = keyof typeof basicBgColors;

export type BasicStyle = keyof typeof basicStyles;

export type Color256 = number;
export type ColorRGB = [number, number, number];
export type ColorBasic = BasicFgColor | BasicBgColor;

export default ColorMe;
