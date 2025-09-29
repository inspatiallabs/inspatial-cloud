import { defineAPIAction } from "@inspatial/cloud";

const logout = defineAPIAction("logout", {
  label: "Logout",
  description: "Logout user",
  async action({ inCloud, inRequest, inResponse }) {
    const sessionId = inRequest.context.get<string>("userSession");
    if (sessionId) {
      // use InCloud.orm to access entries that require admin privileges
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
