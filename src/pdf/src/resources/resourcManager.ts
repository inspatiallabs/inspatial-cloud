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
