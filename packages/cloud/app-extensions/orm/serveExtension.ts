import { ServerExtension } from "@inspatial/serve";
import { PgError } from "../../../orm/db/src/postgres/pgError.ts";
import { ORMException } from "../../../orm/src/orm-exception.ts";

export const ormServeExtension = new ServerExtension("orm", {
  description: "ORM Extension",
  install(_app) {},
  exceptionHandlers: [{
    name: "orm",
    handler(error) {
      if (error instanceof PgError) {
        return {
          serverMessage: {
            content: `${error.name}: ${error.message}\n\tQuery: ${error.query}`,
            subject: "InSpatial ORM - Postgres Error",
            type: error.severity === "ERROR" ? "error" : "warning",
          },
          clientMessage: "An error occurred while processing your request",
          status: 500,
          statusText: "Internal Server Error",
        };
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
