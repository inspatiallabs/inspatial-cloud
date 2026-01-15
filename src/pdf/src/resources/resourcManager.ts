import { Dictionary } from "../objects/dictionary.ts";
import type { PDFFactory } from "../pdf.ts";
import { Font } from "./fonts/font.ts";
import { FontRegistry } from "./fonts/fontRegistry.ts";
import { helveticaWidths } from "./fonts/widths.ts";
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
    const widths = Array.from(helveticaWidths.values());
    const helvetica = this.#addObject();
    helvetica.set("Type", "/Font");
    helvetica.set("Subtype", "/Type1");
    helvetica.set("BaseFont", "/Helvetica");
    helvetica.set("FirstChar", 32);
    helvetica.set("LastChar", 126);
    helvetica.setArray("Widths", widths);
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

    const helveticaBold = this.#addObject();
    helveticaBold.set("Type", "/Font");
    helveticaBold.set("Subtype", "/Type1");
    helveticaBold.set("BaseFont", "/Helvetica-Bold");
    helveticaBold.set("FirstChar", 32);
    helveticaBold.set("LastChar", 126);
    helveticaBold.setArray("Widths", widths);
    const descBold = this.#addObject();
    descBold.set("Type", "/FontDescriptor");
    descBold.set("FontName", "/Helvetica-Bold");
    descBold.set("Flags", 32);
    descBold.setArray("FontBBox", [-166, -225, 1000, 931]);
    descBold.set("ItalicAngle", 0);
    descBold.set("Ascent", 718);
    descBold.set("Descent", -207);
    descBold.set("CapHeight", 718);
    descBold.set("StemV", 88);
    descBold.set("MissingWidth", 0);
    helveticaBold.addReference("FontDescriptor", descBold.objNumber);

    this.fontRegistry.fontDict.addReference("F2", helveticaBold.objNumber);
  }

  #addObject(objectName?: string) {
    return this.#pdf.objects.addObject(objectName);
  }

  async addFont(filePath: string) {
    const addObject = () => this.#addObject();
    // const addStream = ()=> this
    const font = new Font(addObject.bind(this));
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
