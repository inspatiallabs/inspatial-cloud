/**
 * Document Catalog Dictionary (7.7.2)
 */

export class Catalog {
  obj: DocObject;
  constructor(docObject: DocObject) {
    this.obj = docObject;
    this.obj.set("Type", "/Catalog");
  }
}
