import { type ExceptionHandlerResponse, ServerExtension } from "@inspatial/serve";
import { PgError } from "../../../orm/db/src/postgres/pgError.ts";
import { PGErrorCode } from "#db";
import { ORMException } from "../../../orm/src/orm-exception.ts";
import { convertString } from "../../../serve/src/utils/mod.ts";

export const ormServeExtension = new ServerExtension("orm", {
  description: "ORM Extension",
  install(_app) {},
  exceptionHandlers: [{
    name: "orm",
    handler(error) {
      if (error instanceof PgError) {
        const response: ExceptionHandlerResponse = {
          serverMessage: {
            content:
              `${error.name}(${error.code}): ${error.message}\n\tQuery: ${error.query}`,
            subject: "InSpatial ORM - Postgres Error",
            type: error.severity === "ERROR" ? "error" : "warning",
          },
          clientMessage: "An error occurred while processing your request",
          status: 500,
          statusText: "Internal Server Error",
        };
        switch (error.code) {
          case PGErrorCode.UndefinedColumn:
            response.clientMessage = `${
              convertString(
                error.message.split('"')[1],
                "camel",
              )
            } field does not exist in the database. You may need to run a migration`;
            response.status = 400;
            response.statusText = "Bad Request";
        }
        return response;
      }
      if (error instanceof ORMException) {
        return {
          serverMessage: {
            content: `${error.message}`,
            subject: error.subject,
            type: error.type,
          },
          clientMessage: error.message,
          status: error.responseCode || 500,
          statusText: error.subject || "Internal Server Error",
        };
      }
    },
  }],
});
