// import { ServerExtension } from "~/extension/server-extension.ts";
// import { StaticFileHandler } from "#static/staticFileHandler.ts";
// const fileServerExtension = ServerExtension.create("fileServer", {
//   description: "Serve static files",
//   config: {
//     staticFilesRoot: {
//       type: "string",
//       description: "Root directory for static files",
//       required: true,
//       env: "STATIC_FILES_ROOT",
//     },
//   },
//   pathHandlers: [{
//     path: "/(.*)",
//     description: "Serve static files",
//     name: "fileServer",
//     async handler(server, inRequest, _inResponse) {
//       const fileServer = server.getCustomProperty<StaticFileHandler>(
//         "fileServer",
//       );
//       return await fileServer?.serveFile(inRequest.path);
//     },
//   }],
//   install: (server) => {
//     const defaultStaticFilesRoot = Deno.cwd() + "/public";
//     const staticFilesRoot = server.getExtensionConfigValue(
//       "fileServer",
//       "staticFilesRoot",
//     ) || defaultStaticFilesRoot;
//     const fileServer = new StaticFileHandler({
//       staticFilesRoot,
//     });
//     server.addCustomProperty({
//       key: "fileServer",
//       description: "Serve static files",
//       value: fileServer,
//     });
//     return fileServer;
//   },
// });

// export default fileServerExtension;
