import { ContentStream } from "../../graphics/contentStream.ts";
import { Dictionary } from "../../objects/dictionary.ts";
import { DocObject } from "../../objects/docObject.ts";
import { loadFont } from "./fontLoader.ts";

export class Font {
  fontObject: DocObject;
  descriptorObject: DocObject;
  decendentObject: DocObject;
  toUnicodeObj: DocObject;
  fileObject: DocObject;
  #fontName?: string;
  italic: boolean = false;
  maxHeight: number = 0;
  #fontFamily?: string;
  fontStyle?: string;
  #fontWeight?: number;
  widths: Map<number, number> = new Map();
  cmap: Map<number, number> = new Map();
  get fontWeight(): number {
    return this.#fontWeight || 400;
  }

  get fontFamily(): string {
    if (!this.#fontFamily) {
      throw new Error("Font not loaded");
    }
    return this.#fontFamily;
  }
  #data?: Uint8Array;
  get data(): Uint8Array {
    if (!this.#data) {
      throw new Error("Font not loaded");
    }
    return this.#data;
  }
  get fontName(): string {
    if (!this.#fontName) {
      throw new Error("Font not loaded");
    }
    return this.#fontName;
  }
  constructor(
    addObject: () => DocObject,
  ) {
    this.fontObject = addObject();
    this.descriptorObject = addObject();
    this.decendentObject = addObject();
    this.toUnicodeObj = addObject();
    this.fileObject = addObject();
  }
  getStringWidth(text: string, fontSize: number): number {
    let width = 0;
    if (text.length === 0) return 0;
    for (const char of text) {
      const charCode = char.charCodeAt(0);
      const charWidth = this.widths.get(charCode) || 0;
      width += charWidth;
    }
    return width / 1000 * fontSize;
  }
  async load(filePath: string): Promise<void> {
    const { fontName, data, fontDesc, fontDict, widthsMap, header } =
      await loadFont(
        filePath,
      );
    this.cmap = fontDict.cmap;
    this.widths = widthsMap;
    this.#fontName = fontName;
    this.#fontFamily = fontName.split("-")[0];
    this.#fontWeight = fontDesc.fontWeight;
    if (header.italic === true) {
      this.italic = true;
    }
    this.#data = data;
    this.#setupFontObject(fontDict);
    this.#setupDescriptorObject(fontDesc);
    this.#setupUnicodeObject(fontDict);
    this.#setupFileObject();
  }
  #setupFontObject(fontDict: any) {
    const toUnicode = this.toUnicodeObj;
    const fontObj = this.fontObject;
    const deceObj = this.decendentObject;
    fontObj.set("Type", "/Font");
    fontObj.set("Subtype", "/Type0");
    fontObj.addReference("ToUnicode", toUnicode.objNumber);
    fontObj.set("BaseFont", `/${this.fontName}`);
    fontObj.set("Encoding", "/Identity-H");
    fontObj.setArray("DescendantFonts", [
      `${this.decendentObject.objNumber} 0 R`,
    ]);
    deceObj.set("Type", "/Font");
    deceObj.set("BaseFont", `/${this.fontName}`);
    deceObj.addReference("FontDescriptor", this.descriptorObject.objNumber);
    const widths: Array<string> = [];
    const first: number = fontDict.firstChar;
    const last: number = fontDict.lastChar;
    for (let i = first; i <= last; i++) {
      const width = this.widths.get(i);
      const code = this.cmap.get(i);
      if (width !== undefined && code !== undefined) {
        widths.push(`${code} [${width}]`);
      }
    }

    deceObj.setArray("W", widths);

    deceObj.set("CIDtoGIDMap", "/Identity");
    deceObj.set("DW", 1000);
    deceObj.set("Subtype", "/CIDFontType2");
    const cid = new Dictionary();
    cid.set("Supplement", 0);
    cid.set("Registry", "(Adobe)");
    cid.set("Ordering", "(Identity-H)");
    deceObj.set("CIDSystemInfo", cid);
    // fontObj.set("FirstChar", fontDict.firstChar);
    // fontObj.set("LastChar", fontDict.lastChar);
    // fontObj.setArray("Widths", fontDict.widths);
  }
  #setupDescriptorObject(fontDesc: any) {
    const descObj = this.descriptorObject;
    descObj.set("Type", "/FontDescriptor");
    descObj.set("FontName", `/${this.fontName}`);
    descObj.addReference("FontFile2", this.fileObject.objNumber);
    descObj.setArray("FontBBox", fontDesc.fontBBox);
    descObj.set("Flags", fontDesc.flags); // 32?
    // descObj.set("FontFamily", `/${fontDesc.fontFamily}`);
    descObj.set("StemV", fontDesc.stemV);
    descObj.set("ItalicAngle", fontDesc.italicAngle);
    descObj.set("Ascent", fontDesc.ascent);
    descObj.set("Descent", fontDesc.descent);
    descObj.set("CapHeight", fontDesc.capHeight);
    if (fontDesc.fontWeight) {
      descObj.set("FontWeight", fontDesc.fontWeight);
    }
    // if (fontDesc.avgWidth) {
    //   descObj.set("AvgWidth", fontDesc.avgWidth);
    // }
    // if (fontDesc.maxWidth) {
    //   descObj.set("MaxWidth", fontDesc.maxWidth);
    // }
    // if (fontDesc.xHeight) {
    //   descObj.set("XHeight", fontDesc.xHeight);
    // }
    this.maxHeight = fontDesc.fontBBox[3] - fontDesc.fontBBox[1];
  }
  #setupUnicodeObject(fontDict: any) {
    const obj = this.toUnicodeObj;
    const ranges = [];
    const firstChar: number = fontDict.firstChar;
    const lastChar: number = fontDict.lastChar;
    for (let i = firstChar; i < lastChar; i++) {
      const code = this.cmap.get(i);
      if (code !== undefined) {
        ranges.push(`<${byteToHex(code)}><${byteToHex(i)}>`);
      }
    }

    const rows = [
      "/CIDInit /ProcSet findresource begin",
      "12 dict begin",
      "begincmap",
      "/CIDSystemInfo <<",
      "  /Registry (Adobe)",
      "  /Ordering (UCS)",
      "  /Supplement 0",
      ">> def",
      "/CMapName /Adobe-Identity-UCS def",
      "/CMapType 2 def",
      "1 begincodespacerange",
      "<0000><ffff>",
      "endcodespacerange",
      `${ranges.length} beginbfchar`,
      ...ranges,
      "endbfchar",
      "endcmap",
      "CMapName currentdict /CMap defineresource pop",
      "end",
      "end",
    ];
    obj.setCustomByteGenerator(() => {
      const encoder = new TextEncoder();
      const start = encoder.encode("stream\r\n");
      const content = encoder.encode(rows.join("\n"));
      const end = encoder.encode("\r\nendstream\r\n");

      const bytes = new Uint8Array([...start, ...content, ...end]);
      const ref =
        `${obj.objNumber} 0 obj\r\n/Length ${content.byteLength}\r\n/Length1 ${content.byteLength}`;
      const data = encoder.encode(`${ref}\r\n`);
      return new Uint8Array([
        ...data,
        ...bytes,
        ...encoder.encode("endobj\r\n"),
      ]);
    });
  }
  #setupFileObject() {
    const fontData = this.data;
    const fontFile = this.fileObject;

    const bytesToHex = (bytes: Uint8Array) => {
      return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(
        "",
      );
    };

    fontFile.set("Length", fontData.byteLength);
    fontFile.set("Length1", fontData.byteLength);

    this.fileObject.setCustomByteGenerator(() => {
      const encoder = new TextEncoder();
      const content = fontFile.generate();
      const start = encoder.encode("stream\r\n");
      const end = encoder.encode("\r\nendstream\r\n");
      const bytes = new Uint8Array([...start, ...fontData, ...end]);
      const ref = `${fontFile.objNumber} 0 obj`;
      const data = encoder.encode(`${ref}\r\n${content}\r\n`);
      return new Uint8Array([
        ...data,
        ...bytes,
        ...encoder.encode("endobj\r\n"),
      ]);
    });
  }
}

function byteToHex(byte: number) {
  return byte.toString(16).padStart(4, "0");
}
