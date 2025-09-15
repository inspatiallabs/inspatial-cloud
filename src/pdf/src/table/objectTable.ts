import { DocObject } from "../objects/docObject.ts";

export class ObjectTable {
  #objects: Map<number, DocObject> = new Map();
  constructor() {
  }
  get size(): number {
    return this.#objects.size;
  }
  getObject(objectNumber: number) {
    return this.#objects.get(objectNumber);
  }
  getObjectByName(name: string) {
    for (const obj of this.#objects.values()) {
      if (obj.name === name) {
        return obj;
      }
    }
    return undefined;
  }
  addObject(name?: string) {
    const objNumber = this.#objects.size + 1;
    const newObj = new DocObject({
      name,
      objNumber,
    });
    this.#objects.set(objNumber, newObj);
    return newObj;
  }
  setByteOffset(objectNumber: number, offset: number) {
    const obj = this.#objects.get(objectNumber);
    if (!obj) {
      throw new Error(`Object ${objectNumber} doesn't exist`);
    }
    obj.byteOffset = offset;
  }
  writeObjects(file: Deno.FsFile) {
    let currentOffset = file.seekSync(0, Deno.SeekMode.Current);
    for (const obj of this.#objects.values()) {
      obj.byteOffset = currentOffset;
      const data = obj.generateBytes();
      currentOffset += data.byteLength;
      file.writeSync(data);
    }
  }
  writeTable(file: Deno.FsFile): number {
    const currentOffset = file.seekSync(0, Deno.SeekMode.Current);
    const encoder = new TextEncoder();
    const header = `xref\r\n0 ${this.#objects.size}\r\n`;
    file.writeSync(encoder.encode(header));

    const rows = Array.from(this.#objects.values()).sort((a, b) => {
      return a.objNumber > b.objNumber ? a.objNumber : b.objNumber;
    });
    for (const row of rows) {
      const data = row.generateTableEntry();
      file.writeSync(data);
    }
    return currentOffset;
  }
}
