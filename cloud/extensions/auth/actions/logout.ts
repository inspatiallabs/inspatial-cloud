import { CloudAPIAction } from "#/app/cloud-action.ts";

const logout = new CloudAPIAction("logout", {
  label: "Logout",
  description: "Logout user",
  async run({ app, inRequest, inResponse }) {
    const sessionId = inRequest.context.get<string>("userSession");
    if (sessionId) {
      const userSession = await app.orm.findEntry("userSession", {
        sessionId,
      });
      if (userSession) {
        await userSession.delete();
      }
      app.inCache.deleteValue("userSession", sessionId);
    }
    inRequest.context.update("user", null);
    inRequest.context.update("userSession", null);
    inRequest.context.update("authToken", null);
    inResponse.clearCookie("userSession");
  },
  params: [],
});

export default logout;
