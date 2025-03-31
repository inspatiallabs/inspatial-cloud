import { CloudAction } from "#/cloud-action.ts";

const authCheck = new CloudAction("authCheck", {
  description: "Check if user is authenticated",
  run({ inRequest }) {
    return inRequest.context.get("user");
  },
  params: [],
});

export default authCheck;
