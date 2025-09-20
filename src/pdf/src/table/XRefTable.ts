import type { TableEntry } from "../types.ts";

export class XRefTable {
  #entries: Array<TableEntry>;
  get objectCount(): number {
    return this.#entries.length;
  }
  constructor() {
    this.#entries = [];
  }
  addEntry(entry: TableEntry): number {
    this.#entries.push(entry);
    return this.#entries.length;
  }

  generate() {
    const lines = [
      "xref",
      `0 ${this.#entries.length}`,
      ...this.#entries.map((e) =>
        `${e.byteOffset.toString().padStart(10, "0")} ${
          e.genNumber.toString().padStart(5, "0")
        } ${e.inUse ? "n" : "f"}`
      ),
    ];

    return lines.join("\r\n");
  }
}
