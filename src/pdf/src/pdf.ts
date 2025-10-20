import { Dictionary } from "./objects/dictionary.ts";
import type { DocObject } from "./objects/docObject.ts";
import type { Page } from "./pages/page.ts";
import { Pages } from "./pages/pages.ts";
import type { PagesConfig } from "./pages/pageSizes.ts";
import { ResourceManager } from "./resources/resourcManager.ts";
import { ObjectTable } from "./table/objectTable.ts";
import type { PDFVersion } from "./types.ts";

export class PDFFactory {
  version: PDFVersion;
  objects: ObjectTable;
  #catalog: DocObject;
  #encoder = new TextEncoder();
  #file?: Deno.FsFile;
  #filePath: string = "out.pdf";
  pages: Pages;
  resources: ResourceManager;
  constructor(version: PDFVersion = "1.7", config?: PagesConfig) {
    this.version = version;
    this.objects = new ObjectTable();
    this.resources = new ResourceManager(this);
    this.#catalog = this.objects.addObject("catalog");
    this.#catalog.set("Type", "/Catalog");
    this.pages = new Pages(this, config?.fontDefaults);
    const { pageSize = "A4", orientation = "portrait" } = config || {};
    this.pages.setSize(pageSize, orientation);
    this.#catalog.addReference("Pages", this.pages.obj.objNumber);
  }
  addPage(): Page {
    return this.pages.addPage();
  }
  #generateIDs() {
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
  async #writeString(input: string) {
    const bytes = this.#encoder.encode(input);
    await this.file.write(bytes);
  }
  async #writeLine(input: string | number) {
    await this.#writeString(`${input}\r\n`);
  }

  #generateTrailer(args: {
    catalogObjectNum: number;
  }) {
    const { catalogObjectNum } = args;
    const trailer = new Dictionary();
    trailer.set("Size", this.objects.size);
    trailer.addReference("Root", catalogObjectNum);
    trailer.set("ID", `${this.#generateIDs()}`);
    const lines = [
      "trailer",
      "\r\n",
      trailer.generate(),
    ];
    return lines.join("");
  }

  async generate(filePath: string): Promise<number> {
    this.#filePath = filePath;
    const dir = filePath.split("/").slice(0, -1).join("/");
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
    }

    // header
    await this.#writeLine(`%PDF-${this.version}`);

    await this.objects.writeObjects(this.file);
    const xrefStart = await this.objects.writeTable(this.file);
    const trailer = this.#generateTrailer({
      catalogObjectNum: this.#catalog.objNumber,
    });
    await this.#writeLine(trailer);

    await this.#writeLine("startxref");
    await this.#writeLine(xrefStart);
    // Last line, EOF
    await this.#writeString("%%EOF");
    let size = 0;
    if (this.#file) {
      const stat = await this.#file.stat();
      size = stat.size;
      this.#file.close();
      this.#file = undefined;
    }
    return size;
  }
}
