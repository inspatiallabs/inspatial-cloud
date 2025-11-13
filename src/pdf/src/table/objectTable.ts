import { DocObject } from "../objects/docObject.ts";

export class ObjectTable {
  #objects: Map<number, DocObject> = new Map();
  get size(): number {
    return this.#objects.size;
  }
  getObject(objectNumber: number): DocObject | undefined {
    return this.#objects.get(objectNumber);
  }
  getObjectByName(name: string): DocObject | undefined {
    for (const obj of this.#objects.values()) {
      if (obj.name === name) {
        return obj;
      }
    }
    return undefined;
  }
  addObject(name?: string): DocObject {
    const objNumber = this.#objects.size + 1;
    const newObj = new DocObject({
      name,
      objNumber,
    });
    this.#objects.set(objNumber, newObj);
    return newObj;
  }
  setByteOffset(objectNumber: number, offset: number): void {
    const obj = this.#objects.get(objectNumber);
    if (!obj) {
      throw new Error(`Object ${objectNumber} doesn't exist`);
    }
    obj.byteOffset = offset;
  }
  async writeObjects(file: Deno.FsFile): Promise<void> {
    let currentOffset = await file.seek(0, Deno.SeekMode.Current);
    for (const obj of this.#objects.values()) {
      obj.byteOffset = currentOffset;
      const data = obj.generateBytes();
      currentOffset += data.byteLength;
      await file.write(data);
    }
  }
  async writeTable(file: Deno.FsFile): Promise<number> {
    const currentOffset = await file.seek(0, Deno.SeekMode.Current);
    const encoder = new TextEncoder();
    const header = `xref\r\n0 ${this.#objects.size}\r\n`;
    await file.write(encoder.encode(header));

    const rows = Array.from(this.#objects.values()).sort((a, b) => {
      return a.objNumber > b.objNumber ? a.objNumber : b.objNumber;
    });
    for (const row of rows) {
      const data = row.generateTableEntry();
      await file.write(data);
    }
    return currentOffset + 1;
  }
}
