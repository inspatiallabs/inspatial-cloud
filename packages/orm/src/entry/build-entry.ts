import { EntryType } from "#/entry/entry-type.ts";
import { ormLogger } from "#/logger.ts";
import { convertString } from "@inspatial/serve/utils";
import { FieldDefType, ORMFieldDef } from "#/field/types.ts";
import { Entry } from "#/entry/entry.ts";
import { InSpatialOrm } from "#/inspatial-orm.ts";
import { raiseORMException } from "#/orm-exception.ts";

export function buildEntry(entryType: EntryType, entriesPath: string) {
  const changeableFields = new Map<string, ORMFieldDef>();
  for (const field of entryType.fields.values()) {
    if (
      !field.readOnly && !field.hidden &&
      !["id", "updatedAt", "changedAt"].includes(field.key)
    ) {
      changeableFields.set(field.key, field);
    }
  }
  const entryClass = class extends Entry {
    override _fields: Map<string, ORMFieldDef> = entryType.fields;
    override _changeableFields = changeableFields;
    constructor(orm: InSpatialOrm) {
      super(orm, entryType.name);
    }
  };

  makeFields(entryType, entryClass);

  return entryClass;
}

function makeFields(entryType: EntryType, entryClass: typeof Entry) {
  const fields = entryType.fields;
  for (const field of fields.values()) {
    Object.defineProperty(entryClass.prototype, field.key, {
      enumerable: true,
      get() {
        if (!(this as Entry)._data.has(field.key)) {
          (this as Entry)._data.set(field.key, null);
        }
        return (this as Entry)._data.get(field.key);
      },
      set(value) {
        const entry = this as Entry;
        const fieldType = entry._getFieldType(field.type);
        const fieldDef = entry._getFieldDef(field.key);
        value = fieldType.normalize(value, fieldDef);
        const existingValue = entry._data.get(field.key);
        if (existingValue === value) {
          return;
        }
        entry._modifiedValues.set(field.key, {
          from: existingValue,
          to: value,
        });
        const isValid = fieldType.validate(value, fieldDef);
        if (!isValid) {
          raiseORMException(
            `${value} is not a valid value for field ${field.key} in entry ${entry.name}`,
          );
        }
        entry._data.set(field.key, value);
      },
    });
  }
}
export function buildEntryFile(entryType: EntryType, entriesPath: string) {
  Deno.mkdirSync(entriesPath, { recursive: true });

  const fileName = `${convertString(entryType.name, "kebab")}.ts`;
  const filePath = `${entriesPath}/${fileName}`;
  ormLogger.debug(`Building entry for ${entryType.name}`);
  ormLogger.debug(filePath);
  const outLines: string[] = [];

  outLines.push(`import { Entry } from "#orm";`);

  const fieldLines = generateFields(entryType);
  const className = convertString(entryType.name, "pascal");
  outLines.push(`class ${className} extends Entry {`);
  outLines.push(`name:string = "${entryType.name}"`);
  // outLines.push(generateConstructor());
  outLines.push(...fieldLines);
  outLines.push("}");
  outLines.push(`export default ${className};`);
  writeEntryFile(filePath, outLines.join("\n"));
  formatEntryFile(filePath);
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

function generateFields(entryType: EntryType): Array<string> {
  const lines: Array<string> = [];
  for (const field of entryType.fields.values()) {
    const fieldLines = makeField(field);
    lines.push(...fieldLines);
  }
  return lines;
}

function makeField(field: ORMFieldDef) {
  const lines = [
    `get ${field.key}(): ${fieldTypeMap[field.type]}{`,
    `return this._data.get("${field.key}");`,
    `}`,
    `set ${field.key}(value: ${fieldTypeMap[field.type]}){`,
    `this._orm.fieldTypes.get("${field.type}")`,
    `this._data.set("${field.key}", value);`,
    `}`,
  ];
  return lines;
}

function generateConstructor() {
  const lines = [
    "private constructor(db: InSpatialDB) {",
    "super(db)",
    "}",
  ];
  return lines.join("\n");
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
