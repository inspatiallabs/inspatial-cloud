import { ServerExtension } from "../../../serve/src/extension/server-extension.ts";

const authServerExtension = new ServerExtension("auth", {
  description: "Auth extension",
  requestLifecycle: {
    setup: [{
      name: "parseAuth",
      handler(inRequest) {
        const authHeader = inRequest.headers.get("Authorization");
        if (authHeader) {
          const parts = authHeader.split(" ");
          if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
            inRequest.context.register("authToken", parts[1]);
          }
        }
      },
    }],
  },
  install(server) {},
});
