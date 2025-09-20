import { Catalog } from "./catalog.ts";
import { Dictionary } from "./objects/dictionary.ts";
import { Pages } from "./pages/pages.ts";
import type { PagesConfig } from "./pages/pageSizes.ts";
import { ObjectTable } from "./table/objectTable.ts";
import type { PDFVersion } from "./types.ts";

export class PDFFactory {
  version: PDFVersion;
  objects: ObjectTable;
  catalog: Catalog;
  encoder = new TextEncoder();
  #file?: Deno.FsFile;
  #filePath: string = "out.pdf";
  pages: Pages;

  constructor(version: PDFVersion = "1.7", config?: PagesConfig) {
    this.version = version;
    this.objects = new ObjectTable();
    this.catalog = new Catalog(this.objects.addObject("catalog"));
    this.pages = new Pages(this.objects, config?.fontDefaults);
    const { pageSize = "A4", orientation = "portrait" } = config || {};

    this.pages.setSize(pageSize, orientation);
    this.catalog.obj.addReference("Pages", this.pages.obj.objNumber);
  }

  addPage() {
    return this.pages.addPage();
  }
  generateIDs() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    let hex: string = "";
    array.forEach((byte) => {
      hex += byte.toString(16);
    });
    return `[ <${hex}> <${hex}> ]`;
  }
  get file(): Deno.FsFile {
    if (!this.#file) {
      this.#file = Deno.openSync(this.#filePath, {
        create: true,
        truncate: true,
        write: true,
        read: true,
      });
    }
    return this.#file!;
  }
  writeString(input: string) {
    const bytes = this.encoder.encode(input);
    this.file.writeSync(bytes);
  }
  get currentWriteOffset(): number {
    return this.file.seekSync(0, Deno.SeekMode.Current);
  }
  writeLine(input: string | number) {
    this.writeString(`${input}\r\n`);
  }

  generateTrailer(args: {
    catalogObjectNum: number;
  }) {
    const { catalogObjectNum } = args;
    const trailer = new Dictionary();
    trailer.set("Size", this.objects.size);
    trailer.addReference("Root", catalogObjectNum);
    trailer.set("ID", `${this.generateIDs()}`);
    const lines = [
      "trailer",
      "\r\n",
      trailer.generate(),
    ];
    return lines.join("");
  }

  generate(filePath: string) {
    this.#filePath = filePath;

    // header
    this.writeLine(`%PDF-${this.version}`);

    this.objects.writeObjects(this.file);
    const xrefStart = this.objects.writeTable(this.file);
    const trailer = this.generateTrailer({
      catalogObjectNum: this.catalog.obj.objNumber,
    });
    this.writeLine(trailer);

    this.writeLine("startxref");
    this.writeLine(xrefStart);
    // Last line, EOF
    this.writeString("%%EOF");
  }
}
