import { CloudAPIAction, type CloudAPIActionType } from "#/app/cloud-action.ts";
import convertString from "#/utils/convert-string.ts";
import type { ORMFieldType } from "#/orm/field/types.ts";
import type { EntryType } from "#/orm/entry/entry-type.ts";
import { ORMFieldDef } from "#/orm/field/field-def-types.ts";

const generateModels = new CloudAPIAction(
  "generateModels",
  {
    description: "Generate flutter models for entry types",
    params: [{
      key: "path",
      type: "string",
      description: "Path to the generated models",
      required: false,
      label: "Path",
    }],
    async run({ app, params }) {
      const modelsPath = params.path ||
        `${app.orm.generatedRoot}/flutter/models`;
      await Deno.mkdir(modelsPath, { recursive: true });
      const models: string[] = [];
      const helpers = getHelperClasses();
      await writeModelFile(`${modelsPath}/helpers.dart`, helpers.join("\n"));

      for (const entryType of app.orm.entryTypes.values()) {
        const fileName = `${convertString(entryType.name, "snake", true)}.dart`;
        const filePath = `${modelsPath}/${fileName}`;
        const model = generateFlutterModel(entryType);
        await writeModelFile(filePath, model.join("\n"));

        models.push(fileName);
      }
      const exports = models.map((model) => {
        return `export './${model}';`;
      });
      const exportFile = `${modelsPath}/index.dart`;

      await writeModelFile(exportFile, exports.join("\n"));
      return {
        exports: models,
      };
    },
  },
);

export default generateModels as CloudAPIActionType;
function getHelperClasses() {
  const connectionEntryClass = [
    `class ConnectionEntry {`,
    `  final String value;`,
    `  final String label;`,
    ``,
    `  ConnectionEntry(this.value, this.label);`,
    `}`,
    "abstract base class Entry {",
    "  final String id;",
    "  final DateTime createdAt;",
    "  final DateTime updatedAt;",
    "  ",
    "  Entry({",
    "  required this.id,",
    "  required this.createdAt,",
    "  required this.updatedAt,",
    "  });",
    "  }",
  ];
  return connectionEntryClass;
}
function generateFlutterModel(entryType: EntryType) {
  const className = convertString(entryType.name, "pascal", true);
  const lines: string[] = [
    "import './helpers.dart';",
    "",
    `final class ${className} extends Entry {`,
  ];
  const fields = generateFieldDefs(entryType);
  lines.push(...fields.flatMap((field) => field));
  const converting = generateJsonConverting(entryType);
  lines.push(...converting);
  const constructorClass = generateConstructor(entryType);
  lines.push(...constructorClass);
  lines.push("}");

  return lines;
}
function shouldIgnoreField(field: ORMFieldDef) {
  return field.key.endsWith("#") || field.hidden ||
    ["id", "createdAt", "updatedAt"].includes(field.key);
}
function generateFieldDefs(entryType: EntryType) {
  const fields: string[] = [];
  entryType.fields.values().forEach((field) => {
    if (shouldIgnoreField(field)) {
      return;
    }
    const fieldType = flutterTypeMap[field.type];

    const lines: string[] = [
      `  /// ${field.label}: ${field.description}`,
      `  final ${fieldType}${field.required ? "" : "?"} ${field.key};`,
    ];

    fields.push(...lines);
  });
  return fields;
}

function generateJsonConverting(entryType: EntryType) {
  const className = convertString(entryType.name, "pascal", true);
  const fromJson: string[] = [
    ` factory ${className}.fromJson(Map<String, dynamic> json) {`,
    `    return ${className}(`,
    `      id: json['id'] as String,`,
    `      createdAt: DateTime.fromMillisecondsSinceEpoch(json['createdAt'] as int),`,
    `      updatedAt: DateTime.fromMillisecondsSinceEpoch(json['updatedAt'] as int),`,
  ];
  // const toJson: string[] = [
  //   `  Map<String, dynamic> toJson() {`,
  // ];
  for (const field of entryType.fields.values()) {
    if (shouldIgnoreField(field)) {
      continue;
    }
    switch (field.type) {
      case "ConnectionField":
        fromJson.push(
          `    ${field.key}: ConnectionEntry(`,
          `      json['${field.key}'] as String,`,
          `      json['${field.key}#'] as String,`,
          `    ),`,
        );

        break;
      case "TimeStampField":
        fromJson.push(
          `    ${field.key}: DateTime.fromMillisecondsSinceEpoch(json['${field.key}'] as int${
            field.required ? "" : "?"
          }),`,
        );
        break;
      default: {
        const fieldType = flutterTypeMap[field.type];
        fromJson.push(
          `    ${field.key}: json['${field.key}'] as ${fieldType}${
            field.required ? "" : "?"
          },`,
        );
      }
    }
  }
  fromJson.push(`    );`);
  fromJson.push(`  }`);
  return fromJson;
}

function generateConstructor(entryType: EntryType) {
  const className = convertString(entryType.name, "pascal", true);
  const constructor: string[] = [
    ` ${className}({`,
    `    required super.id,`,
    `    required super.createdAt,`,
    `    required super.updatedAt,`,
  ];
  for (const field of entryType.fields.values()) {
    if (shouldIgnoreField(field)) {
      continue;
    }
    constructor.push(
      `    ${field.required ? "required " : ""}this.${field.key},`,
    );
  }
  constructor.push(`  });`);
  constructor.push(``);
  return constructor;
}

const flutterTypeMap: Record<ORMFieldType, string> = {
  URLField: "String",
  IDField: "String",
  BigIntField: "int",
  BooleanField: "bool",
  DataField: "String",
  TimeStampField: "DateTime",
  TextField: "String",
  IntField: "int",
  DateField: "DateTime",
  DecimalField: "double",
  JSONField: "Map<String, dynamic>",
  PasswordField: "String",
  ListField: "List<String>",
  ChoicesField: "String",
  MultiChoiceField: "List<String>",
  EmailField: "String",
  ConnectionField: "ConnectionEntry",
  CurrencyField: "double",
  RichTextField: "String",
  ImageField: "String",
  PhoneField: "String",
};

async function writeModelFile(
  filePath: string,
  content: string,
): Promise<void> {
  await Deno.writeTextFile(filePath, content);
}
