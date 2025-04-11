import { CloudAction } from "#/cloud-action.ts";

const authCheck = new CloudAction("authCheck", {
  description: "Check if user is authenticated",
  run({ inRequest }) {
    const user = inRequest.context.get("user");

    return user;
  },
  params: [],
});

export default authCheck;
