import { EntryType } from "../orm/entry/entry-type.ts";
import { ormFields } from "../orm/field/fields.ts";
import { FieldMeta } from "./_field-meta.type.ts";
export const fieldMeta = new EntryType<FieldMeta>("fieldMeta", {
  systemGlobal: true,
  label: "Field Meta",
  description: "",
  idMode: {
    type: "fields",
    fields: ["entryMeta", "key"],
  },
  titleField: "label",
  defaultListFields: [
    "label",
    "entryMeta",
    "key",
    "type",
    "description",
    "required",
  ],
  fieldGroups: [{
    key: "generalInfo",
    label: "General Information",
    description: "Basic information about the field.",
    fields: ["key", "label", "type", "entryMeta"],
  }, {
    key: "common",
    label: "Common Attributes",
    description: "Common attributes for all field types.",
    fields: [
      "description",
      "required",
      "readOnly",
      "unique",
      "defaultValue",
      "hidden",
      "placeholder",
    ],
  }, {
    key: "connection",
    label: "Connection Field",
    fields: ["entryType"],
    description: "Attributes specific to connection fields.",
  }],
  fields: [{
    key: "entryMeta",
    type: "ConnectionField",
    entryType: "entryMeta",
    required: true,
  }, {
    key: "key",
    type: "DataField",
    required: true,
  }, {
    key: "label",
    type: "DataField",
    required: true,
  }, {
    key: "type",
    type: "ChoicesField",
    choices: ormFields.map((f) => ({
      key: f.type,
      label: f.type.replace("Field", ""),
      description: f.description,
    })),
    required: true,
  }, {
    key: "description",
    type: "TextField",
    description: "A brief description of the field.",
  }, {
    key: "required",
    type: "BooleanField",
    description: "Whether the field is mandatory.",
  }, {
    key: "readOnly",
    type: "BooleanField",
    description: "Whether the field is read-only.",
  }, {
    key: "unique",
    type: "BooleanField",
    description: "Whether the field must have unique values across entries.",
  }, {
    key: "defaultValue",
    type: "DataField",
    description: "The default value for the field.",
  }, {
    key: "hidden",
    type: "BooleanField",
    description: "Whether the field is hidden in the UI.",
  }, {
    key: "placeholder",
    type: "DataField",
    description: "Placeholder text for the field.",
  }, {
    key: "entryType",
    type: "ConnectionField",
    entryType: "entryMeta",
    description: "The entry type this connection field is associated with.",
    dependsOn: {
      field: "type",
      value: "ConnectionField",
    },
  } // {
    //   key: "inField",
    //   type: "JSONField",
    //   readOnly: true,
    // }
  ],
  // hooks: {
  //   beforeUpdate: [{
  //     name: "generateInField",
  //     description: "Generate the inField JSON based on the field properties.",
  //     handler({ fieldMeta }) {
  //       const field: InField<any> = {
  //         key: fieldMeta.key,
  //         label: fieldMeta.label,
  //         type: fieldMeta.type,
  //         description: fieldMeta.description,
  //         // required: fieldMeta.required,
  //         // readOnly: fieldMeta.readOnly,
  //         // unique: fieldMeta.unique,
  //         // defaultValue: fieldMeta.defaultValue,
  //         // hidden: fieldMeta.hidden,
  //         // placeholder: fieldMeta.placeholder,
  //       };
  //       const booleanFields = [
  //         "required",
  //         "readOnly",
  //         "unique",
  //         "hidden",
  //       ] as const;
  //       for (const fieldName of booleanFields) {
  //         if (fieldMeta[fieldName] !== undefined) {
  //           field[fieldName] = fieldMeta[fieldName];
  //         }
  //         fieldMeta.inField = field;
  //       }
  //     },
  //   }],
  // },
});

// fieldMeta.addAction({
//   key: "generateField",
//   params: [{
//     key: "forPreview",
//     type: "BooleanField",
//     label: "For Preview",
//   }],
//   async action({ fieldMeta, orm }) {
//     const lines: Array<string> = [];
//     const addProperty = (name: string, value: any, raw?: boolean) => {
//       if (value !== undefined && value !== null) {
//         if (raw) {
//           lines.push(`${name}: ${value}`);
//           return;
//         }
//         lines.push(`${name}: "${value}"`);
//       }
//     };
//     lines.push(`key: "${fieldMeta.key}"`);
//     addProperty("label", fieldMeta.label);
//     addProperty("description", fieldMeta.description);
//     lines.push(`type: "${fieldMeta.type}"`);
//     addProperty("required", fieldMeta.required, true);
//     addProperty("readOnly", fieldMeta.readOnly, true);
//     addProperty("unique", fieldMeta.unique, true);
//     addProperty("defaultValue", fieldMeta.defaultValue);
//     addProperty("hidden", fieldMeta.hidden, true);
//     addProperty("placeholder", fieldMeta.placeholder);
//     if (fieldMeta.type === "ConnectionField") {
//       if (fieldMeta.entryType) {
//         const { rows } = await orm.getEntryList("entryMeta", {
//           columns: ["key"],
//           filter: {
//             id: fieldMeta.entryType,
//           },
//         });
//         if (rows.length > 0) {
//           const key = rows[0].key;
//           addProperty("entryType", key);
//         }
//       }
//     }

//     const field = `{\n    ${lines.join(",\n    ")},\n  }`;
//     return field;
//   },
// });
