import { CloudAPIAction } from "~/api/cloud-action.ts";
import convertString from "~/utils/convert-string.ts";
import { EntryType } from "~/orm/entry/entry-type.ts";
import { ChildEntryType } from "~/orm/child-entry/child-entry.ts";
import { SettingsType } from "~/orm/settings/settings-type.ts";
import type { InField, InFieldType } from "~/orm/field/field-def-types.ts";

const generateModels = new CloudAPIAction(
  "generateModels",
  {
    description: "Generate flutter models for entry types",
    params: [{
      key: "path",
      type: "TextField",
      description: "Path to the generated models",
      required: false,
      label: "Path",
    }],
    async run({ inCloud, params }) {
      const modelsPath = params.path ||
        `${inCloud.orm.generatedRoot}/flutter/models`;
      await Deno.mkdir(`${modelsPath}/settings`, { recursive: true });
      await Deno.mkdir(`${modelsPath}/entries`, { recursive: true });
      const models: string[] = [];
      const helpers = getHelperClasses();
      await writeModelFile(`${modelsPath}/helpers.dart`, helpers.join("\n"));
      const { entryTypes, settingsTypes } = inCloud.roles.getRole(
        "systemAdmin",
      );
      const defs = [
        ...Array.from(entryTypes.values()),
        ...Array.from(settingsTypes.values()),
      ];
      for (const entryType of defs) {
        const fileName = await buildModel(entryType, modelsPath);

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
async function buildModel(
  typeDef: EntryType | SettingsType,
  modelsPath: string,
) {
  const isEntry = typeDef instanceof EntryType;
  const subDir = isEntry ? "entries" : "settings";
  const fileName = `${convertString(typeDef.name, "snake", true)}.dart`;
  const filePath = `${modelsPath}/${subDir}/${fileName}`;
  const enums = [];
  enums.push(...generateModelEnums(typeDef));
  const model = generateFlutterModel(typeDef);
  model.unshift(`import '../helpers.dart';`);
  const childrenModels = [];
  for (const child of typeDef.children?.values() ?? []) {
    const childModel = generateFlutterModel(child);
    enums.push(...generateModelEnums(child));
    childrenModels.push(childModel);
  }
  model.push(...childrenModels.flatMap((child) => child));
  model.push(...enums);
  await writeModelFile(filePath, model.join("\n"));
  return `${subDir}/${fileName}`;
}
export default generateModels as CloudAPIAction<any, any>;
function getHelperClasses() {
  return [
    entry,
    settings,
    childEntry,
    childList,
    connectionField,
    fileField,
    imageField,
    valueIfNotNull,
  ];
}
function generateFlutterModel(
  entryOrChildType: EntryType | ChildEntryType | SettingsType,
) {
  const className = convertString(entryOrChildType.name, "pascal", true);
  let type: "Entry" | "Settings" | "Child" = "Entry";
  let extendsClass = "Entry";
  if (entryOrChildType instanceof ChildEntryType) {
    extendsClass = "ChildEntry";
    type = "Child";
  }
  if (entryOrChildType instanceof SettingsType) {
    extendsClass = "Settings";
    type = "Settings";
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
  const converting = generateJsonConverting(entryOrChildType, type);
  lines.push(...converting);
  const constructorClass = generateConstructor(entryOrChildType, type);
  lines.push(...constructorClass);
  lines.push("}");

  if (type === "Entry") {
    const listModelLines = generateListModel(entryOrChildType as EntryType);
    lines.push(...listModelLines);
  }
  return lines;
}

function generateListModel(entryType: EntryType): Array<string> {
  const listFields = new Map();
  entryType.defaultListFields.forEach((fieldKey) => {
    listFields.set(fieldKey, entryType.fields.get(fieldKey));
  });
  const listType = {
    ...entryType,
    name: entryType.name + "List",
    fields: listFields,
    children: undefined,
  } as EntryType;
  const className = convertString(listType.name, "pascal", true);
  const lines: string[] = [
    `final class ${className} extends Entry {`,
  ];
  const fields = generateFieldDefs(listType.fields);
  lines.push(...fields);
  const converting = generateJsonConverting(listType, "Entry");
  lines.push(...converting);
  const constructorClass = generateConstructor(listType, "Entry");
  lines.push(...constructorClass);
  lines.push("}");
  return lines;
}
function shouldIgnoreField(field: InField) {
  return field.key.endsWith("__title") || field.hidden ||
    ["id", "createdAt", "updatedAt", "parent"].includes(field.key);
}

function generateModelEnums(
  typeDef: EntryType | ChildEntryType | SettingsType,
): string[] {
  const lines: string[] = [];
  for (const field of typeDef.fields.values()) {
    if (field.type === "ChoicesField") {
      lines.push(...makeChoiceEnum(field as InField<"ChoicesField">));
    }
  }
  return lines;
}
function makeChoiceEnum(field: InField<"ChoicesField">): string[] {
  const lines: string[] = [];

  const choices = field.choices.map((choice) => {
    return `  ${choice.key}("${choice.key}","${choice.label}"),`;
  });
  choices[choices.length - 1] = choices[choices.length - 1].replace(
    /,$/,
    ";",
  );
  const enumName = convertString(field.key, "pascal", true);
  lines.push(
    `enum ${enumName} {`,
    ...choices,
    ``,
    ` final String key;`,
    ` final String label;`,
    ` const ${enumName}(this.key,this.label);`,
    `}`,
  );

  return lines;
}
function generateFieldDefs(fields: Map<string, InField>) {
  const output: string[] = [];
  fields.values().forEach((field) => {
    if (shouldIgnoreField(field)) {
      return;
    }
    let fieldType;
    switch (field.type) {
      case "ChoicesField":
        fieldType = convertString(field.key, "pascal", true);
        break;

      default:
        fieldType = flutterTypeMap[field.type];
    }
    const lines: string[] = [
      `  /// ${field.label}: ${field.description}`,
      `  ${fieldType}${field.required ? "" : "?"} ${field.key};`,
    ];

    output.push(...lines);
  });
  return output;
}

function generateJsonConverting(
  entryOrChildType: EntryType | ChildEntryType | SettingsType,
  type: "Entry" | "Settings" | "Child",
) {
  const className = convertString(entryOrChildType.name, "pascal", true);
  let toJsonMixin = `
    'id': valueIfNotNull<String>(id,(value)=>value),
    'createdAt': valueIfNotNull<DateTime>(createdAt,(value)=>value.millisecondsSinceEpoch),
    'updatedAt': valueIfNotNull<DateTime>(updatedAt,(value)=>value.millisecondsSinceEpoch),
    `;
  let fromJsonMixin = `
    id: valueIfNotNull<String>(json['id'], (value) => value),
    createdAt: valueIfNotNull<int>(json['createdAt'],
      (value) => DateTime.fromMillisecondsSinceEpoch(value)),
      updatedAt: valueIfNotNull<int>(json['updatedAt'],
      (value) => DateTime.fromMillisecondsSinceEpoch(value)),`;
  if (type == "Settings") {
    toJsonMixin = ``;
    fromJsonMixin = ``;
  }
  const toJson: string[] = [
    ` Map<String, dynamic> toJson() {`,
    `    return {
      ${toJsonMixin}`,
  ];
  const fromJson: string[] = [
    `  factory ${className}.fromJson(Map<String, dynamic> json) {
    return ${className}(${fromJsonMixin}`,
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
            `              json['${field.key}__title'] as String,`,
            `         ) : null,`,
          );
          toJson.push(
            `    '${field.key}': ${field.key}${
              field.required ? "" : "?"
            }.value,`,
            `    '${field.key}__title': ${field.key}${
              field.required ? "" : "?"
            }.label,`,
          );
          break;
        }
        fromJson.push(
          `    ${field.key}:${field.type}(`,
          `      json['${field.key}'] as String,`,
          `      json['${field.key}__title'] as String,`,
          `    ),`,
        );
        toJson.push(
          `    '${field.key}': ${field.key}.value,`,
          `    '${field.key}__title': ${field.key}${
            field.required ? "" : "?"
          }.label,`,
        );

        break;
      case "ChoicesField": {
        const enumName = convertString(field.key, "pascal", true);
        let val = `    ${field.key}:`;
        if (!field.required) {
          val += `json['${field.key}'] != null\n        ?`;
        }
        val += ` ${enumName}.values
          .firstWhere((e) => e.key == json['${field.key}'] as String)`;

        if (!field.required) {
          val += `\n          : null`;
        }
        val += `,`;
        fromJson.push(val);
        toJson.push(
          `    '${field.key}': ${field.key}${field.required ? "" : "?"}.key,`,
        );
        break;
      }
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
function generateConstructor(
  entryOrChildType: EntryType | ChildEntryType | SettingsType,
  type: "Entry" | "Settings" | "Child",
) {
  const isChild = entryOrChildType instanceof ChildEntryType;
  const className = convertString(entryOrChildType.name, "pascal", true);
  const req = `${!isChild ? "required " : ""}`;
  const constructor: string[] = [
    ` ${className}({`,
  ];
  if (type === "Entry" || type === "Child") {
    constructor.push(
      `    ${req}super.id,`,
      `    ${req}super.createdAt,`,
      `    ${req}super.updatedAt,`,
    );
  }

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

const flutterTypeMap: Record<InFieldType, string> = {
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

const settings = `
abstract base class Settings {}
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
