import { Dictionary } from "../objects/dictionary.ts";
import type { DocObject } from "../objects/docObject.ts";
import type { Page } from "../pages/page.ts";

export class ImageStream {
  width: number = 0;
  height: number = 0;
  transform = {
    width: 1,
    height: 1,
    x: 0,
    y: 0,
  };
  bitsPerComponent: number;
  colorSpace: string;
  imgObject: DocObject;
  drawObject: DocObject;
  imgData?: Uint8Array;
  constructor(page: Page, _options?: {
    width?: number;
    height?: number;
  }) {
    this.imgObject = page.addObject();
    this.drawObject = page.addObject();
    this.bitsPerComponent = 16;
    this.colorSpace = "/DeviceRGB";
    this.setProperty("Type", "/XObject");
    // this.setProperty("Interpolate", "true");
    this.setProperty("Subtype", "/Image");
    this.setProperty("BitsPerComponent", this.bitsPerComponent);
    const adjust = 2 / 255;

    const offset = 2.2;
    console.log({ adjust, more: 255 / (adjust / 255) });
    const lowVal = 0 - 1 / offset;
    const highVal = 1 * offset;

    this.imgObject.setArray("Decode", [
      lowVal,
      highVal,
      lowVal,
      highVal,
      lowVal,
      highVal,
    ]);
    this.setProperty("ColorSpace", this.colorSpace);

    const dict = new Dictionary();
    dict.addReference(
      `Im${this.imgObject.objNumber}`,
      this.imgObject.objNumber,
    );
    page.addResourceDictionary("XObject", dict);

    this.imgObject.setCustomByteGenerator(() => {
      return this.generateImageBytes();
    });
    this.drawObject.setCustomByteGenerator(() => {
      return this.generateDrawBytes();
    });
  }
  setData(data: Uint8Array) {
    this.imgData = new Uint8Array(data);
    return this;
  }

  setDimensions(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.setProperty("Width", width);
    this.setProperty("Height", height);
    return this;
  }
  setSize(width: number, height: number) {
    this.transform.width = width;
    this.transform.height = height;
    return this;
  }
  setPosition(x: number, y: number) {
    this.transform.x = x;
    this.transform.y = y;
    return this;
  }
  setProperty(key: string, value: string | number) {
    this.imgObject.set(key, value);
  }
  bytesToHex(data: Uint8Array) {
    return Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
  }
  generateImageBytes() {
    const encoder = new TextEncoder();
    const imgObject = this.imgObject;

    const hexText = this.bytesToHex(this.imgData || new Uint8Array());
    const bytes = encoder.encode(hexText);
    // const bytes = this.imgData || new Uint8Array();
    const start = encoder.encode("stream\r\n");
    const end = encoder.encode("\rendstream\r\n");
    // imgObject.setArray("Filter", ["/ASCIIHexDecode"]);
    imgObject.set("Length", bytes.length);
    const content = imgObject.generate();
    const ref = `${imgObject.objNumber} 0 obj`;
    const data = encoder.encode(`${ref}\r\n${content}\r\n`);
    console.log({ imgObject, bytesLength: bytes.length });

    return new Uint8Array([
      ...data,
      ...start,
      ...bytes,
      ...end,
      ...encoder.encode("endobj\r\n"),
    ]);
  }
  generateDrawBytes(): Uint8Array {
    const encoder = new TextEncoder();
    const contentArray: Array<string> = [
      "q\r\n", // Save graphics state
    ];
    const drawObject = this.drawObject;
    const { height, width, x, y } = this.transform;
    contentArray.push(
      `${width} 0 0 ${height} ${x} ${y} cm\r\n`,
    );
    contentArray.push(`/Im${this.imgObject.objNumber} Do\r\n`);
    contentArray.push("Q\r\n"); // Restore graphics state
    const contents = encoder.encode(contentArray.join(""));
    const contentLength = contents.length;
    const start = encoder.encode("stream\r\n");
    const end = encoder.encode("endstream\r\n");
    const bytes = new Uint8Array([...start, ...contents, ...end]);

    drawObject.set("Length", contentLength);
    const content = drawObject.generate();
    const ref = `${drawObject.objNumber} 0 obj`;
    const data = encoder.encode(`${ref}\r\n${content}\r\n`);
    return new Uint8Array([
      ...data,
      ...bytes,
      ...encoder.encode("endobj\r\n"),
    ]);
  }
}
