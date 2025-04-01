import { ServerExtension } from "@inspatial/serve";
import { authLifecycle } from "#extension/auth/serve-extension/auth-lifecycle.ts";
import { authMiddleware } from "#extension/auth/serve-extension/auth-middleware.ts";

export const authServerExtension: ServerExtension<"auth"> = new ServerExtension(
  "auth",
  {
    description: "Auth extension",
    config: {
      allowAll: {
        type: "boolean",
        description: "Allow all users to access the app",
        default: false,
        required: false,
      },
    },
    requestLifecycle: {
      setup: [authLifecycle],
    },
    middleware: [authMiddleware],
    install() {
    },
  },
);
