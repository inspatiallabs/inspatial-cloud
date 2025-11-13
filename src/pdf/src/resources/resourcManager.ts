import { Dictionary } from "../objects/dictionary.ts";
import type { PDFFactory } from "../pdf.ts";
import { Font } from "./fonts/font.ts";
import { FontRegistry } from "./fonts/fontRegistry.ts";
import { ImageRegistry } from "./images/imageRegistry.ts";

export class ResourceManager {
  resourceDict: Dictionary;
  fontRegistry: FontRegistry;
  imageRegistry: ImageRegistry;
  #pdf: PDFFactory;

  constructor(pdf: PDFFactory) {
    this.#pdf = pdf;
    this.resourceDict = new Dictionary();
    this.fontRegistry = new FontRegistry();
    this.imageRegistry = new ImageRegistry();
    this.resourceDict.addReferenceDictionary(
      "Font",
      this.fontRegistry.fontDict,
    );
    this.#addDefaultFont();
  }
  #addDefaultFont() {
    const helvetica = this.#addObject();
    helvetica.set("Type", "/Font");
    helvetica.set("Subtype", "/Type1");
    helvetica.set("BaseFont", "/Helvetica");
    helvetica.set("FirstChar", 33);
    helvetica.set("LastChar", 126);
    helvetica.setArray("Widths", [
      278,
      355,
      556,
      556,
      889,
      667,
      222,
      333,
      333,
      389,
      584,
      278,
      333,
      278,
      278,
      556,
      556,
      556,
      556,
      556,
      556,
      556,
      556,
      556,
      556,
      278,
      278,
      584,
      584,
      584,
      556,
      1015,
      667,
      667,
      722,
      722,
      667,
      611,
      778,
      722,
      278,
      500,
      667,
      556,
      833,
      722,
      778,
      667,
      778,
      722,
      667,
      611,
      722,
      667,
      944,
      667,
      667,
      611,
      278,
      278,
      278,
      469,
      556,
      222,
      556,
      556,
      500,
      556,
      556,
      278,
      556,
      556,
      222,
      222,
      500,
      222,
      833,
      556,
      556,
      556,
      556,
      333,
      500,
      278,
      556,
      500,
      722,
      500,
      500,
      500,
      334,
      260,
      334,
      584,
    ]);
    const desc = this.#addObject();
    desc.set("Type", "/FontDescriptor");
    desc.set("FontName", "/Helvetica");
    desc.set("Flags", 32);
    desc.setArray("FontBBox", [-166, -225, 1000, 931]);
    desc.set("ItalicAngle", 0);
    desc.set("Ascent", 718);
    desc.set("Descent", -207);
    desc.set("CapHeight", 718);
    desc.set("StemV", 88);
    desc.set("MissingWidth", 0);
    helvetica.addReference("FontDescriptor", desc.objNumber);

    this.fontRegistry.fontDict.addReference("F1", helvetica.objNumber);
  }
  #addObject(objectName?: string) {
    return this.#pdf.objects.addObject(objectName);
  }

  async addFont(filePath: string) {
    const fontObj = this.#addObject();
    const descObj = this.#addObject();
    const fileObj = this.#addObject();
    const font = new Font(fontObj, descObj, fileObj);
    await font.load(filePath);
    this.fontRegistry.registerFont(font);
  }
  async addFontDirectory(dirPath: string) {
    for await (const dirEntry of Deno.readDir(dirPath)) {
      if (dirEntry.isFile && dirEntry.name.endsWith(".ttf")) {
        const filePath = `${dirPath}/${dirEntry.name}`;
        await this.addFont(filePath);
      }
    }
  }
}
