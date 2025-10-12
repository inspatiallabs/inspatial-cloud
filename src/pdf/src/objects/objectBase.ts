import type { Page } from "../pages/page.ts";

export abstract class ObjectBase {
  page: Page;
  constructor(page: Page) {
    this.page = page;
  }
  abstract generate(): string;
}
