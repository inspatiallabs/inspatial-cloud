export class Dictionary {
  #isArray = false;
  #arrayKey?: string;
  makeArray(values: Array<string | number>): void {
    this.#isArray = true;
    const key = this.#arrayKey || `Array${Math.floor(Math.random() * 10000)}`;
    this.#arrayKey = key;
    this.setArray(key, values);
  }
  values: Map<string, string | Dictionary> = new Map();
  set(key: string, value: string | number | Dictionary): void {
    value = value instanceof Dictionary ? value : value.toString();
    this.values.set(key, value);
  }
  has(key: string): boolean {
    return this.values.has(key);
  }
  get(key: string): string | Dictionary | undefined {
    return this.values.get(key);
  }

  setArray(key: string, value: Array<string | number>): void {
    this.set(key, `[ ${value.join(" ")} ]`);
  }
  addReferenceDictionary(key: string, dict: Dictionary): void {
    this.set(key, dict);
  }
  addReference(key: string, tableRow: number, sectionNumber: number = 0): void {
    this.set(key, `${tableRow} ${sectionNumber} R`);
  }
  generate(): string | Dictionary {
    if (this.#isArray && this.#arrayKey) {
      const arrayValue = this.values.get(this.#arrayKey);
      if (arrayValue) {
        return arrayValue;
      }
    }
    const lines: string[] = [];
    for (const [key, value] of this.values.entries()) {
      if (value instanceof Dictionary) {
        lines.push(`/${key} ${value.generate()}`);
        continue;
      }
      lines.push(`/${key} ${value}`);
    }
    return `<<\r\n  ${lines.join("\r\n  ")}\r\n>>`;
  }
}
