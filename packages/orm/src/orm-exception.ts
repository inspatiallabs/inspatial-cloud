export class ORMException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ORMException";
  }
}

export function raiseORMException(message: string): never {
  throw new ORMException(message);
}
