import { CloudAction } from "#/cloud-action.ts";
import cloudLogger from "#/cloud-logger.ts";

const authCheck = new CloudAction("authCheck", {
  description: "Check if user is authenticated",
  run({ inRequest }) {
    const user = inRequest.context.get("user");
    cloudLogger.info(user);
    return user;
  },
  params: [],
});

export default authCheck;
