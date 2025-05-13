import { CloudAPIAction } from "#/api/cloud-action.ts";

const authCheck = new CloudAPIAction("authCheck", {
  description: "Check if user is authenticated",
  run({ inRequest }) {
    const user = inRequest.context.get("user");

    return user;
  },
  params: [],
});

export default authCheck;
