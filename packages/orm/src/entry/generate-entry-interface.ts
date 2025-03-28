import type { EntryType } from "#/entry/entry-type.ts";
import { convertString } from "@inspatial/serve/utils";

import type { ormLogger } from "#/logger.ts";
import { raiseORMException } from "#/orm-exception.ts";
import type { InSpatialORM } from "#/inspatial-orm.ts";
import type { FieldDefType } from "#/field/field-def-types.ts";

export function generateEntryInterface(
  orm: InSpatialORM,
  entryType: EntryType,
  entriesPath: string,
) {
  Deno.mkdirSync(entriesPath, { recursive: true });

  const fileName = `${convertString(entryType.name, "kebab", true)}.ts`;
  const filePath = `${entriesPath}/${fileName}`;

  const outLines: string[] = [
    'import { EntryBase } from "#orm/types";',
    `export interface ${
      convertString(entryType.name, "pascal", true)
    } extends EntryBase {`,
    ` _name:"${convertString(entryType.name, "camel", true)}"`,
  ];

  const fields = buildFields(orm, entryType);
  outLines.push(...fields);

  outLines.push("}");
  writeEntryFile(filePath, outLines.join("\n"));
  formatEntryFile(filePath);
}

function buildFields(orm: InSpatialORM, entryType: EntryType) {
  const fields: string[] = [];
  entryType.fields.forEach((field) => {
    const { label, description, required } = field;
    let fieldType = fieldTypeMap[field.type];
    if (field.type === "ChoicesField") {
      fieldType = field.choices?.map((choice) => {
        return `'${choice.key as string}'`;
      }).join(" | ") || "string";
    }
    const titleField = [];
    if (field.type === "ConnectionField") {
      const connection = orm.getEntryType(field.entryType);
      let valueType = "string";
      switch (connection.config.idMode) {
        case "auto":
          valueType = "number";
          break;
        case "ulid":
        case "uuid":
          valueType = "string";
          break;
      }
      fieldType = valueType;

      if (connection.config.titleField) {
        const titleFieldDef = connection.fields.get(
          connection.config.titleField,
        )!;
        titleField.push(
          `_${field.key}Title${required ? "?" : ""}: ${
            fieldTypeMap[titleFieldDef.type]
          } `,
        );
      }
    }
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
    const row = [
      `${field.key}${required ? "" : "?"}: ${fieldType};`,
    ];

    fields.push([...doc, ...row].join("\n"));
    fields.push(...titleField);
  });
  return fields;
}
async function formatEntryFile(filePath: string) {
  const process = new Deno.Command(Deno.execPath(), {
    args: ["fmt", filePath],
  }).spawn();
  const status = await process.status;
  return status.success;
}
function writeEntryFile(filePath: string, content: string) {
  Deno.writeTextFileSync(filePath, content);
}

const fieldTypeMap: Record<FieldDefType, string> = {
  URLField: "string",
  BigIntField: "number",
  BooleanField: "boolean",
  ChoicesField: "string",
  ConnectionField: "string",
  CurrencyField: "string",
  DataField: "string",
  DateField: "string",
  DecimalField: "number",
  EmailField: "string",
  ImageField: "string",
  IntField: "number",
  JSONField: "Record<string, any>",
  ListField: "Array<string>",
  TimeStampField: "number",
  TextField: "string",
  MultiChoiceField: "Array<string>",
  PasswordField: "string",
  PhoneField: "string",
  RichTextField: "string",
  IDField: "string",
};
