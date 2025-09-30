import { defineAPIAction } from "../../api/cloud-action.ts";

const authCheck = defineAPIAction("authCheck", {
  description: "Check if user is authenticated",
  action({ inRequest }) {
    const user = inRequest.context.get("user");

    return user;
  },
  params: [],
});

export default authCheck;
