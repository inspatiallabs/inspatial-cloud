import { ChildEntryType, EntryType } from "@inspatial/cloud";

export const customerAccount = new EntryType(
  "customerAccount",
  {
    label: "Customer Account",
    idMode: "ulid",
    titleField: "customerName",
    fields: [
      {
        key: "customerName",
        type: "DataField",
        label: "Customer Name",
        required: true,
      },
      {
        key: "customerId",
        type: "DataField",
        label: "Customer ID",
        required: true,
      },
    ],
    children: [
      new ChildEntryType("users", {
        description: "Users associated with this account",
        label: "Users",
        fields: [{
          key: "user",
          label: "User",
          type: "ConnectionField",
          entryType: "user",
        }, {
          key: "isOwner",
          label: "Is Owner",
          type: "BooleanField",
        }],
      }),
    ],
  },
);
