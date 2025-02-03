import InSpatialApp, {
  AppAction,
  AppActionGroup,
  AppExtension,
} from "../packages/app/mod.ts";
import { ServerExtension } from "#serve";
import { log } from "#log";

const loginAction = new AppAction("login", {
  params: [{
    key: "email",
    description: "The email address",
    type: "string",
    required: true,
  }, {
    key: "password",
    description: "The password",
    type: "string",
    required: false,
  }],
  run({ params }) {
    const { email, password } = params;
    return {
      success: true,
      message: "Logged in!",
      email,
      password,
    };
  },
});
const authActionGroup = new AppActionGroup("auth", {
  description: "This is my group",
  actions: [loginAction],
});

const testActionGroup = new AppActionGroup("db", {
  description: "This is my group",
  actions: [
    new AppAction("getTables", {
      params: [],
      async run() {
        const result = await myApp.db.getTableNames();
        myApp.realtime.notify({
          roomName: "notifications",
          event: "notification",
          data: {
            tables: result,
          },
        });
        return result;
      },
    }),
  ],
});
const meServerExtension = new ServerExtension("me", {
  description: "This is my server extension",
  install(server) {
    return {
      getThings() {},
      stuff: "things",
    };
  },
});
const youServerExtension = new ServerExtension("you", {
  description: "This is my server extension",
  install(server) {
    return {
      youThings() {},
      stuffYous: "things",
    };
  },
});

const extension = new AppExtension({
  key: "my-extension",
  title: "My Extension",
  description: "This is my extension",
  version: "1.0.0",
  install(app) {},
  serverExtensions: [meServerExtension, youServerExtension],
  actionGroups: [authActionGroup, testActionGroup],
});
const myApp = new InSpatialApp("My App", {
  appExtensions: [extension],
});
myApp.realtime.addRoom({
  roomName: "notifications",
  description: "A room for notifications",
});

// setInterval(() => {
//   myApp.realtime.notify({
//     roomName: "notifications",
//     event: "notification",
//     data: {
//       message: "Hello, world!",
//     },
//   });
// }, 1000);

// const db = myApp.server.getExtension("db");

// await myApp.generateConfigFile();

// const version = await db.version();
// log.info(version, "version");

// const tables = await db.getTableNames();
// const columns = await db.getTableColumns("user");
// log.info(columns, "columns");
// log.info(tables, "tables");
// if (import.meta.main) {
//   myApp.run();
// }
// const me = myApp.server.getExtension("me");
// await myApp.runAction("test", "me");

// const result = await myApp.runAction("auth", "login", {
//   email: "email",
// });

// console.log({ result });
await myApp.ready;
export default myApp;
