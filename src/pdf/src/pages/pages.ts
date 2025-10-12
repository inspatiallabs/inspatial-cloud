import type { DocObject } from "../objects/docObject.ts";
import type { PDFFactory } from "../pdf.ts";
import type { FontDefaults } from "../resources/fonts/fontRegistry.ts";
import type { ObjectTable } from "../table/objectTable.ts";
import { Page } from "./page.ts";
import { type PagesConfig, pageSize } from "./pageSizes.ts";

export class Pages {
  obj: DocObject;
  pages: Map<number, Page>;
  pdf: PDFFactory;
  get table(): ObjectTable {
    return this.pdf.objects;
  }
  bounds: [number, number, number, number] = [0, 0, 0, 0];
  get pageSize(): { width: number; height: number } {
    const width = this.bounds[2] - this.bounds[0];
    const height = this.bounds[3] - this.bounds[1];
    return { width, height };
  }
  fontDefaults: FontDefaults;
  constructor(pdf: PDFFactory, fontDefaults?: FontDefaults) {
    this.pdf = pdf;
    this.fontDefaults = {
      family: fontDefaults?.family || "Helvetica",
      italic: fontDefaults?.italic || false,
      weight: fontDefaults?.weight || 400,
      size: fontDefaults?.size || 12,
    };

    this.obj = this.table.addObject("pages");
    this.pages = new Map();
    this.obj.set("Type", "/Pages");
    this.setBounds([0, 0, 612, 792]);
  }
  setSize(
    size: PagesConfig["pageSize"] = "A4",
    orientation: PagesConfig["orientation"] = "portrait",
  ) {
    const selectedSize = pageSize[size];
    let x: number = selectedSize.width;
    let y: number = selectedSize.height;
    if (orientation === "landscape") {
      [x, y] = [y, x];
    }
    this.setBounds([0, 0, x, y]);
  }

  addPage(_args?: {
    name?: string;
  }) {
    const pageObject = this.table.addObject();

    const page = new Page({
      pageObject,
      pages: this,
      bounds: this.bounds,
      parent: this.obj.objNumber,
    });

    this.pages.set(this.pages.size + 1, page);
    this.#setKids();
    return page;
  }
  #setKids() {
    const kids = Array.from(
      this.pages.values().map((page) => {
        return `${page.objNumber} 0 R`;
      }),
    );
    this.obj.set("Count", this.pages.size);
    this.obj.setArray("Kids", kids);
  }
  setBounds(bounds: [number, number, number, number]) {
    this.bounds = bounds;
    this.obj.setArray("MediaBox", bounds);
  }
}
