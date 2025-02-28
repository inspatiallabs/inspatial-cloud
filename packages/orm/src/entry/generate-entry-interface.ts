import { EntryType } from "#/entry/entry-type.ts";
import convertString from "../../../serve/src/utils/convert-string.ts";
import { FieldDefType } from "#/field/types.ts";
import { ormLogger } from "#/logger.ts";
import { raiseORMException } from "#/orm-exception.ts";

export function generateEntryInterface(
  entryType: EntryType,
  entriesPath: string,
) {
  Deno.mkdirSync(entriesPath, { recursive: true });

  const fileName = `${convertString(entryType.name, "kebab")}.ts`;
  const filePath = `${entriesPath}/${fileName}`;
  ormLogger.debug(`Building entry for ${entryType.name}`);
  ormLogger.debug(filePath);
  const outLines: string[] = [
    'import { EntryBase } from "#orm";',
    `export interface ${
      convertString(entryType.name, "pascal")
    } extends EntryBase {`,
    ` _name:"${convertString(entryType.name, "camel")}"`,
  ];

  const fields = buildFields(entryType);
  outLines.push(...fields);

  outLines.push("}");
  writeEntryFile(filePath, outLines.join("\n"));
  formatEntryFile(filePath);
}

function buildFields(entryType: EntryType) {
  const fields: string[] = [];
  entryType.fields.forEach((field) => {
    let fieldType = fieldTypeMap[field.type];
    if (field.type === "ChoicesField") {
      fieldType = field.choices?.map((choice) => {
        return `'${choice.key as string}'`;
      }).join(" | ") || "string";
    }
    if (!fieldType) {
      raiseORMException(
        `Field type ${field.type} does not exist`,
        "Build",
        400,
      );
    }
    const { label, description, required } = field;
    const doc = [
      `/**`,
      ` * **${label || ""}** (${field.type})`,
    ];
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
