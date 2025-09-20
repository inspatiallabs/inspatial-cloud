import type { Dictionary } from "../objects/dictionary.ts";
import type { DocObject } from "../objects/docObject.ts";
import { ContentStream } from "../graphics/canvas.ts";
import type { Pages } from "./pages.ts";
export class Page {
  #obj: DocObject;
  #pages: Pages;
  contents: Map<number, DocObject>;
  get resources(): Dictionary {
    return this.#pages.resources;
  }
  get objNumber(): number {
    return this.#obj.objNumber;
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
    this.setupContent();
    this.#obj = pageObject;
    this.#obj.set("Type", "/Page");

    if (parent) {
      this.#obj.addReference("Parent", parent);
    }
    this.#obj.addReferenceDictionary("Resources", this.resources);
    if (bounds) {
      this.#obj.setArray("MediaBox", bounds);
    }
  }
  addContentStream() {
    const contentStream = new ContentStream(
      this,
      {
        fontDefaults: this.#pages.fontDefaults,
      },
    );
    const contentObj = this.#pages.table.addObject();
    contentObj.addContentStream(contentStream);
    this.contents.set(contentObj.objNumber, contentObj);
    this.#obj.setArray(
      "Contents",
      Array.from(this.contents.keys()).map((k) => `${k} 0 R`),
    );
    return contentStream;
  }
  setupContent() {
    // this.#contents.set("Filter", "/FlateDecode");
  }
}
