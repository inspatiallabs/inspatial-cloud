export class ORMException extends Error {
  subject?: string;
  responseCode?: number;
  type: "error" | "warning" = "error";
  constructor(message: string, subject?: string, responseCode?: number) {
    super(message);
    this.subject = subject || "ORM Exception";
    this.responseCode = responseCode || 500;
    switch (this.responseCode) {
      case 404:
        this.type = "warning";
        break;
    }

    this.name = "ORMException";
  }
}

export function raiseORMException(
  message: string,
  subject?: string,
  responseCode?: number,
): never {
  throw new ORMException(message, subject, responseCode);
}
