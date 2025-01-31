export class PgError extends Error {
  severity: string;
  code: string;
  detail: string;
  override message: string;
  fullMessage: Record<string, string>;
  query?: string;

  constructor(options: Record<string, string>) {
    super(options.message);
    this.severity = options.severity;
    this.code = options.code;
    this.detail = options.detail;
    this.message = options.message;
    this.name = options.name;
    this.fullMessage = options;
    this.query = options.query;
  }
}
