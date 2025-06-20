import type { InSpatialORM } from "/orm/inspatial-orm.ts";
import { fieldTypeMap } from "/orm/build/generate-interface/field-type-map.ts";
import { raiseORMException } from "/orm/orm-exception.ts";
import type { InField } from "/orm/field/field-def-types.ts";

export function buildFields(
  _orm: InSpatialORM,
  fieldDefs: Map<string, InField>,
): Array<string> {
  const fields: string[] = [];
  fieldDefs.forEach((field) => {
    const { label, description, required } = field;
    let fieldType = fieldTypeMap[field.type];
    if (field.type === "ChoicesField") {
      fieldType = field.choices?.map((choice) => {
        return `'${choice.key as string}'`;
      }).join(" | ") || "string";
    }
    // const titleField = [];
    // if (field.type === "ConnectionField") {
    //   const connection = orm.getEntryType(field.entryType);
    //   let valueType = "string";
    //   switch (connection.config.idMode) {
    //     case "auto":
    //       valueType = "number";
    //       break;
    //     case "ulid":
    //     case "uuid":
    //       valueType = "string";
    //       break;
    //   }
    //   fieldType = valueType;

    //   if (connection.config.titleField) {
    //     const titleFieldDef = connection.fields.get(
    //       connection.config.titleField,
    //     )!;
    //     titleField.push(
    //       `_${field.key}Title${required ? "?" : ""}: ${
    //         fieldTypeMap[titleFieldDef.type]
    //       } `,
    //     );
    //   }
    // }
    if (!fieldType) {
      raiseORMException(
        `Field type ${field.type} does not exist`,
        "Build",
        400,
      );
    }

    const doc = [
      `/**`,
      ` * **${label || ""}** (${field.type})`,
    ];
    if (field.type === "ConnectionField") {
      doc.push(" *");
      doc.push(` * **EntryType** \`${field.entryType}\``);
    }
    if (description) {
      doc.push(` * @description ${description}`);
    }
    doc.push(` * @type {${fieldType}}`);
    if (required) {
      doc.push(` * @required ${required}`);
    }
    doc.push(` */`);
    let key = field.key;
    if (field.key.endsWith("#")) {
      key = `"${field.key}"`;
    }
    const row = [
      `${key}${required ? "" : "?"}: ${fieldType};`,
    ];

    fields.push([...doc, ...row].join("\n"));
    // fields.push(...titleField);
  });
  return fields;
}
