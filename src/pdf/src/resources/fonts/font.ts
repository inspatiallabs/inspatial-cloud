import { DocObject } from "../../objects/docObject.ts";
import { loadFont } from "./fontLoader.ts";

export class Font {
  fontObject: DocObject;
  descriptorObject: DocObject;
  fileObject: DocObject;
  #fontName?: string;
  italic: boolean = false;
  maxHeight: number = 0;
  #fontFamily?: string;
  fontStyle?: string;
  #fontWeight?: number;
  widths: Map<number, number> = new Map();
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
    fontObject: DocObject,
    descriptorObject: DocObject,
    fileObj: DocObject,
  ) {
    fontObject.set("Type", "/Font");
    fontObject.set("Subtype", "/TrueType");
    fontObject.addReference("FontDescriptor", descriptorObject.objNumber);
    descriptorObject.set("Type", "/FontDescriptor");
    descriptorObject.addReference("FontFile2", fileObj.objNumber);

    this.fontObject = fontObject;
    this.descriptorObject = descriptorObject;
    this.fileObject = fileObj;
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
    this.#setupFileObject();
  }
  #setupFontObject(fontDict: any) {
    const fontObj = this.fontObject;
    fontObj.set("BaseFont", `/${this.fontName}`);
    fontObj.set("FirstChar", fontDict.firstChar);
    fontObj.set("LastChar", fontDict.lastChar);
    fontObj.setArray("Widths", fontDict.widths);
    fontObj.set("Encoding", fontDict.encoding);
  }
  #setupDescriptorObject(fontDesc: any) {
    const descObj = this.descriptorObject;
    descObj.set("FontName", `/${this.fontName}`);
    descObj.set("FontFamily", `/${fontDesc.fontFamily}`);
    descObj.set("Flags", fontDesc.flags);
    // descObj.setArray("FontBBox", fontDesc.fontBBox);
    descObj.set("ItalicAngle", fontDesc.italicAngle);
    descObj.set("Ascent", fontDesc.ascent);
    descObj.set("Descent", fontDesc.descent);
    descObj.set("CapHeight", fontDesc.capHeight);
    descObj.set("StemV", fontDesc.stemV);
    if (fontDesc.fontWeight) {
      descObj.set("FontWeight", fontDesc.fontWeight);
    }
    if (fontDesc.avgWidth) {
      descObj.set("AvgWidth", fontDesc.avgWidth);
    }
    if (fontDesc.maxWidth) {
      descObj.set("MaxWidth", fontDesc.maxWidth);
    }
    if (fontDesc.xHeight) {
      descObj.set("XHeight", fontDesc.xHeight);
    }
    this.maxHeight = fontDesc.fontBBox[3] - fontDesc.fontBBox[1];
  }
  #setupFileObject() {
    const fontData = this.data;
    const fontFile = this.fileObject;
    fontFile.set("Length1", fontData.length + 1);

    const bytesToHex = (bytes: Uint8Array) => {
      return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(
        "",
      );
    };
    const hexData = bytesToHex(fontData);
    const hexBytes = new TextEncoder().encode(hexData);
    fontFile.setArray("Filter", ["/ASCIIHexDecode"]);
    fontFile.set("Length", hexData.length); // +1 for the '>' at the end of ASCIIHexDecode

    // const hexBytes = fontData;
    // fontFile.set("Length", hexBytes.length);
    this.fileObject.setCustomByteGenerator(() => {
      const encoder = new TextEncoder();
      const content = fontFile.generate();
      const start = encoder.encode("stream\r\n");
      const end = encoder.encode("endstream\r\n");
      const bytes = new Uint8Array([...start, ...hexBytes, ...end]);
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
