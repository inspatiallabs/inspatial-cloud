import { ContentStream } from "../graphics/contentStream.ts";
import type { Dictionary } from "../objects/dictionary.ts";
import type { DocObject } from "../objects/docObject.ts";
import type { ResourceManager } from "../resources/resourcManager.ts";
import type { Pages } from "./pages.ts";

export class Page {
  #obj: DocObject;
  #pages: Pages;
  contents: Map<number, DocObject>;
  get resources(): ResourceManager {
    return this.#pages.pdf.resources;
  }
  get objNumber(): number {
    return this.#obj.objNumber;
  }
  getFontName(fontFamily: string, options?: {
    fontWeight?: number | "normal" | "bold" | "light" | "extrabold";
    italic?: boolean;
  }): string | undefined {
    return this.resources.fontRegistry.getFontName(fontFamily, options);
  }
  get pageSize(): {
    width: number;
    height: number;
  } {
    return this.#pages.pageSize;
  }
  constructor(args: {
    pageObject: DocObject;
    pages: Pages;
    parent?: number;
    bounds?: [number, number, number, number];
  }) {
    const { pageObject, bounds, parent, pages } = args;
    this.contents = new Map();
    this.#pages = pages;
    this.#obj = pageObject;
    this.#obj.set("Type", "/Page");

    if (parent) {
      this.#obj.addReference("Parent", parent);
    }
    this.#obj.addReferenceDictionary("Resources", this.resources.resourceDict);
    if (bounds) {
      this.#obj.setArray("MediaBox", bounds);
    }
  }
  addResourceDictionary(name: string, dict: Dictionary): void {
    this.resources.resourceDict.addReferenceDictionary(name, dict);
  }
  addContentStream(): ContentStream {
    const contentObj = this.#pages.table.addObject();
    const contentStream = new ContentStream(
      this,
      contentObj,
      {
        fontDefaults: this.#pages.fontDefaults,
      },
    );
    contentObj.addContentStream(contentStream);
    this.contents.set(contentObj.objNumber, contentObj);
    this.#obj.setArray(
      "Contents",
      Array.from(this.contents.keys()).map((k) => `${k} 0 R`),
    );
    return contentStream;
  }
  addObject(): DocObject {
    const obj = this.#pages.table.addObject();
    this.contents.set(obj.objNumber, obj);
    this.#obj.setArray(
      "Contents",
      Array.from(this.contents.keys()).map((k) => `${k} 0 R`),
    );
    return obj;
  }
  _addImage(_filePath: string): never {
    throw new Error("images not supported yet");
    // const imgData = Deno.readFileSync(filePath);
    // const dimensions = get_img_dimensions(imgData);
    // const width = dimensions[0];
    // const height = dimensions[1];
    // const data = get_img_bytes(imgData);
    // const slice = data.subarray(50);
    // console.log(slice);
    // const imageStream = new ImageStream(this);
    // imageStream.setDimensions(width, height);
    // imageStream.setData(data);

    // const ratio = 300 / 72;
    // imageStream.setSize(width / ratio, height / ratio);

    // return imageStream;
  }
}
