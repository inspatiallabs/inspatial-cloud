import InSpatialCloud, {
  CloudAction,
  CloudActionGroup,
  CloudExtension,
} from "../packages/cloud/mod.ts";
import userAgentExtension from "#user-agent";
import { EntryType } from "#orm";
import { User } from "./.inspatial/_generated/entries/user.ts";

const getUserAgentAction = new CloudAction("getUserAgent", {
  params: [],
  run({ inRequest }) {
    return inRequest.context.get("userAgent");
  },
});

const authActionGroup = new CloudActionGroup("auth", {
  description: "This is my amazing",
  actions: [getUserAgentAction],
});
const userEntry = new EntryType<User>("user", {
  idMode: "ulid",
  defaultListFields: ["firstName", "lastName"],
  fields: [{
    key: "firstName",
    type: "DataField",
    label: "First Name",
    description: "The user's first name",
    required: true,
  }, {
    key: "lastName",
    type: "DataField",
    label: "Last Name",
    description: "The user's last names",
    required: true,
  }, {
    key: "email",
    type: "EmailField",
    label: "Email",
    description: "The user's email address used for login",
    required: true,
    unique: true,
  }, {
    key: "fullName",
    type: "DataField",
    label: "Full Name",
    description: "The user's password used for login",
    readOnly: true,
  }],
  actions: [
    {
      key: "login",
      async action({ user, orm, data }) {
        data.email;
        data.password;
        data.number;
        return {
          ...data,
        };
      },
      params: [{
        key: "email",
        type: "string",
        label: "Password",
        required: true,
      }, {
        key: "password",
        type: "string",
        description: "The user's password used for login",
        required: false,
      }],
    },
  ],
  hooks: {},
});

const extension = new CloudExtension({
  key: "my-extension",
  title: "My Extension",
  description: "This is my extension",
  version: "1.0.0",
  install() {},
  entryTypes: [userEntry],
  serverExtensions: [userAgentExtension],
  actionGroups: [authActionGroup],
});

const myApp = new InSpatialCloud("My App", {
  appExtensions: [extension],
});

await myApp.generateConfigFile();

await myApp.ready;
export default myApp;
