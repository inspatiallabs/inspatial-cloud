import ColorMe from "../../../terminal/color-me.ts";
import { convertString } from "../../../utils/mod.ts";
import { PGErrorCode } from "./maps/errorMap.ts";

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

export function isPgError(error: unknown): error is PgError {
  return error instanceof PgError;
}

export function handlePgError(error: PgError) {
  const response: Array<string> = [];
  const subject = error.name;
  switch (error.code) {
    case PGErrorCode.UndefinedColumn:
      response.push(`${
        convertString(
          error.message.split('"')[1],
          "camel",
        )
      } field does not exist in the database. You may need to run a migration`);
      break;
    case PGErrorCode.ForeignKeyViolation:
      response.push(error.detail);

      break;
    case PGErrorCode.InvalidCatalogName:
      response.push(
        `Database ${error.message} does not exist. Please check your database configuration`,
      );
      break;
    case PGErrorCode.SyntaxError:
      if (error.fullMessage.position && error.query) {
        const position = parseInt(error.fullMessage.position, 10);
        const query = error.query;
        const firstPart = query.slice(0, position - 1);
        let secondPart = query.slice(position - 1);
        let match = error.message.replace('syntax error at or near "', "");
        match = match.substring(0, match.length - 1);
        secondPart = secondPart.replace(
          match,
          ColorMe.fromOptions(match, { color: "brightRed" }),
        );
        response.push(`${firstPart}${secondPart}`);
        break;
      }

      response.push(
        `Query: ${error.query} \n ${
          ColorMe.fromOptions(error.message, { color: "brightRed" })
        }`,
      );
      break;
    default:
      console.log(error);
      throw error;
  }
  return { subject, response };
}
