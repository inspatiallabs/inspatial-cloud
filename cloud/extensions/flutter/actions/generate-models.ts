import { CloudAPIAction, type CloudAPIActionType } from "#/app/cloud-action.ts";
import convertString from "#/utils/convert-string.ts";
import type { ORMFieldType } from "#/orm/field/types.ts";
import type { EntryType } from "#/orm/entry/entry-type.ts";
import { ORMFieldDef } from "#/orm/field/field-def-types.ts";
import { ChildEntryType } from "#/orm/child-entry/child-entry.ts";

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
        model.unshift(`import './helpers.dart';`);
        const childrenModels = Array.from(
          entryType.children?.values().map((child) => {
            return generateFlutterModel(child);
          }) ?? [],
        );
        model.push(...childrenModels.flatMap((child) => child));
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
  return [
    entry,
    childEntry,
    childList,
    connectionField,
    fileField,
    imageField,
    valueIfNotNull,
  ];
}
function generateFlutterModel(entryOrChildType: EntryType | ChildEntryType) {
  const className = convertString(entryOrChildType.name, "pascal", true);
  let extendsClass = "Entry";
  if (entryOrChildType instanceof ChildEntryType) {
    extendsClass = "ChildEntry";
  }
  const lines: string[] = [
    `final class ${className} extends ${extendsClass} {`,
  ];
  const fields = generateFieldDefs(entryOrChildType.fields);

  lines.push(...fields);
  if (entryOrChildType.children) {
    const childrenFields = generateChildrenFields(entryOrChildType.children);
    lines.push(childrenFields);
  }
  const converting = generateJsonConverting(entryOrChildType);
  lines.push(...converting);
  const constructorClass = generateConstructor(entryOrChildType);
  lines.push(...constructorClass);
  lines.push("}");

  return lines;
}
function shouldIgnoreField(field: ORMFieldDef) {
  return field.key.endsWith("#") || field.hidden ||
    ["id", "createdAt", "updatedAt", "parent"].includes(field.key);
}
function generateFieldDefs(fields: Map<string, ORMFieldDef>) {
  const output: string[] = [];
  fields.values().forEach((field) => {
    if (shouldIgnoreField(field)) {
      return;
    }
    const fieldType = flutterTypeMap[field.type];

    const lines: string[] = [
      `  /// ${field.label}: ${field.description}`,
      `  ${fieldType}${field.required ? "" : "?"} ${field.key};`,
    ];

    output.push(...lines);
  });
  return output;
}

function generateJsonConverting(entryOrChildType: EntryType | ChildEntryType) {
  const className = convertString(entryOrChildType.name, "pascal", true);
  const toJson: string[] = [
    ` Map<String, dynamic> toJson() {`,
    `    return {
    'id': valueIfNotNull<String>(id,(value)=>value),
    'createdAt': valueIfNotNull<DateTime>(createdAt,(value)=>value.millisecondsSinceEpoch),
    'updatedAt': valueIfNotNull<DateTime>(updatedAt,(value)=>value.millisecondsSinceEpoch),`,
  ];
  const fromJson: string[] = [
    `  factory ${className}.fromJson(Map<String, dynamic> json) {
    return ${className}(
      id: valueIfNotNull<String>(json['id'], (value) => value),
      createdAt: valueIfNotNull<int>(json['createdAt'],
          (value) => DateTime.fromMillisecondsSinceEpoch(value)),
      updatedAt: valueIfNotNull<int>(json['updatedAt'],
          (value) => DateTime.fromMillisecondsSinceEpoch(value)),`,
  ];
  // const toJson: string[] = [
  //   `  Map<String, dynamic> toJson() {`,
  // ];
  for (const field of entryOrChildType.fields.values()) {
    if (shouldIgnoreField(field)) {
      continue;
    }
    switch (field.type) {
      case "FileField":
      case "ImageField":
      case "ConnectionField":
        if (!field.required) {
          fromJson.push(
            `    ${field.key}: json['${field.key}'] != null `,
            `        ? ${field.type}(`,
            `              json['${field.key}'] as String,`,
            `              json['${field.key}#'] as String,`,
            `         ) : null,`,
          );
          toJson.push(
            `    '${field.key}': ${field.key}${
              field.required ? "" : "?"
            }.value,`,
            `    '${field.key}#': ${field.key}${
              field.required ? "" : "?"
            }.label,`,
          );
          break;
        }
        fromJson.push(
          `    ${field.key}:${field.type}(`,
          `      json['${field.key}'] as String,`,
          `      json['${field.key}#'] as String,`,
          `    ),`,
        );
        toJson.push(
          `    '${field.key}': ${field.key}.value,`,
          `    '${field.key}#': ${field.key}${
            field.required ? "" : "?"
          }.label,`,
        );

        break;
      case "TimeStampField":
        fromJson.push(
          `    ${field.key}: DateTime.fromMillisecondsSinceEpoch(json['${field.key}'] as int${
            field.required ? "" : "?"
          }),`,
        );
        toJson.push(
          `    '${field.key}': ${field.key}${
            field.required ? "" : "?"
          }.millisecondsSinceEpoch,`,
        );
        break;
      default: {
        const fieldType = flutterTypeMap[field.type];
        fromJson.push(
          `    ${field.key}: json['${field.key}'] as ${fieldType}${
            field.required ? "" : "?"
          },`,
        );
        toJson.push(
          `    '${field.key}': ${field.key},`,
        );
      }
    }
  }
  for (const child of entryOrChildType.children?.values() ?? []) {
    const className = convertString(child.name, "pascal", true);
    fromJson.push(
      `    ${child.name}: ChildList<${className}>.fromJson(`,
      `      json['${child.name}'] as List<dynamic>,`,
      `      ${className}.fromJson,`,
      `    ),`,
    );
    toJson.push(
      `    '${child.name}': ${child.name}.items.map((e) => e.toJson()).toList(),`,
    );
  }

  fromJson.push(`    );`);
  fromJson.push(`  }`);
  toJson.push(`    };`);
  toJson.push(`  }`);
  return [...fromJson, ...toJson];
}
function generateChildrenFields(children: Map<string, ChildEntryType>) {
  let output = "";
  for (const child of children?.values() ?? []) {
    const className = convertString(child.name, "pascal", true);
    const lines: string[] = [
      `  /// ${child.label}: ${child.description}`,
      `  final ChildList<${className}> ${child.name};`,
    ];
    output += lines.join("\n") + "\n";
  }
  return output;
}
function generateConstructor(entryOrChildType: EntryType | ChildEntryType) {
  const isChild = entryOrChildType instanceof ChildEntryType;
  const className = convertString(entryOrChildType.name, "pascal", true);
  const req = `${!isChild ? "required " : ""}`;
  const constructor: string[] = [
    ` ${className}({`,
    `    ${req}super.id,`,
    `    ${req}super.createdAt,`,
    `    ${req}super.updatedAt,`,
  ];
  for (const field of entryOrChildType.fields.values()) {
    if (shouldIgnoreField(field)) {
      continue;
    }
    constructor.push(
      `    ${field.required ? "required " : ""}this.${field.key},`,
    );
  }
  for (const child of entryOrChildType.children?.values() ?? []) {
    constructor.push(
      `    required this.${child.name},`,
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
  ConnectionField: "ConnectionField",
  CurrencyField: "double",
  RichTextField: "String",
  ImageField: "ImageField",
  PhoneField: "String",
  FileField: "FileField",
};

async function writeModelFile(
  filePath: string,
  content: string,
): Promise<void> {
  await Deno.writeTextFile(filePath, content);
}
const childList = `
typedef JsonFactory<T> = T Function(Map<String, dynamic> json);

class ChildList<T> {
  final List<T> items;
  get totalCount => items.length;

  ChildList({
    required this.items,
  });

  factory ChildList.fromJson(
      List<dynamic> childListJson, JsonFactory<T> fromJson) {
    return ChildList(
      items: childListJson.map((e) => fromJson(e)).toList(),
    );
  }
  add(T item) {
    items.add(item);
  }
}
`;
const connectionField = `
class ConnectionField {
  final String value;
  final String label;

  ConnectionField(this.value, this.label);
}
`;

const entry = `
abstract base class Entry {
  final String id;
  final DateTime createdAt;
  final DateTime updatedAt;

  Entry({
    required this.id,
    required this.createdAt,
    required this.updatedAt,
  });
}
`;
const childEntry = `
abstract base class ChildEntry {
  final String? id;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  ChildEntry({
    this.id,
    this.createdAt,
    this.updatedAt,
  });
}
`;
const fileField = `
class FileField extends ConnectionField {
  FileField(super.value, super.label);
}
`;

const imageField = `
class ImageField extends ConnectionField {
  ImageField(super.value, super.label);
}
`;

const valueIfNotNull = `
valueIfNotNull<T>(T? value, Function(T value) callback) {
  if (value == null) {
    return null;
  }
  return callback(value);
}
`;
