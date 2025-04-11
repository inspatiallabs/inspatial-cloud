import {
  type ExceptionHandlerResponse,
  ServerExtension,
} from "@inspatial/serve";
import { PgError, PGErrorCode } from "#db";
import { ORMException } from "#orm";
import { convertString } from "@inspatial/serve/utils";

export const ormServeExtension = new ServerExtension("orm", {
  description: "ORM Extension",
  install(_app): void {
  },
  config: {
    autoTypes: {
      description:
        "Automatically generate the ORM interfaces and types when the server starts and `SERVE_MODE` is set to `development`",
      required: false,
      type: "boolean",
      default: true,
    },
    autoMigrate: {
      description:
        "Automatically run the migrations when the server starts and `SERVE_MODE` is set to `development`",
      required: false,
      type: "boolean",
      default: true,
    },
  },
  exceptionHandlers: [{
    name: "orm",
    handler(error): ExceptionHandlerResponse | undefined {
      if (error instanceof PgError) {
        const response: ExceptionHandlerResponse = {
          serverMessage: {
            content:
              `${error.name}(${error.code}): ${error.message}\n\tQuery: ${error.query} \n\tDetail: ${error.detail}`,
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
            break;
          case PGErrorCode.ForeignKeyViolation:
            response.clientMessage = error.detail;
            response.status = 400;
            response.statusText = "Cannot Delete";
            break;
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

      // if (error instanceof Error) {
      //   return {
      //     serverMessage: {
      //       content: error.message,
      //       subject: "InSpatial ORM - Unknown Error",
      //       type: "error",
      //     },
      //     clientMessage: "An unknown error occurred",
      //     status: 500,
      //     statusText: "Internal Server Error",
      //   };
      // }
      // return {
      //   serverMessage: {
      //     content: "An unknown error occurred",
      //     subject: "InSpatial ORM - Unknown Error",
      //     type: "error",
      //   },
      //   clientMessage: "An unknown error occurred",
      //   status: 500,
      //   statusText: "Internal Server Error",
      // };
    },
  }],
});
