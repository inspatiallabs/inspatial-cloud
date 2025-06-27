import { CloudAPIAction } from "~/api/cloud-action.ts";

const logout = new CloudAPIAction("logout", {
  label: "Logout",
  description: "Logout user",
  async run({ inCloud, inRequest, inResponse }) {
    const sessionId = inRequest.context.get<string>("userSession");
    if (sessionId) {
      const userSession = await inCloud.orm.findEntry("userSession", [{
        field: "sessionId",
        op: "=",
        value: sessionId,
      }]);
      if (userSession) {
        await userSession.delete();
      }
      inCloud.inCache.deleteValue("userSession", sessionId);
    }
    inRequest.context.update("user", null);
    inRequest.context.update("userSession", null);
    inRequest.context.update("authToken", null);
    inResponse.clearCookie("userSession");
  },
  params: [],
});

export default logout;
