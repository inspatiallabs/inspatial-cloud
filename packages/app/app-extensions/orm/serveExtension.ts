import { ServerExtension } from "@inspatial/serve";
import { PgError } from "../../../orm/db/src/postgres/pgError.ts";

export const ormServeExtension = new ServerExtension("orm", {
  description: "ORM Extension",
  install(app) {},
  exceptionHandlers: [{
    name: "orm",
    handler(error) {
      console.log("PgError");
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
    },
  }],
});
