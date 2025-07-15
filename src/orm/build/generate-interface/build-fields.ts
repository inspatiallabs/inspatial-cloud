import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import { fieldTypeMap } from "~/orm/build/generate-interface/field-type-map.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";
import type { InField } from "~/orm/field/field-def-types.ts";

export function buildField(field: InField): string {
  const { label, description, required } = field;
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

  const lines = [
    `/**`,
    ` * **${label || ""}** (${field.type})`,
  ];
  if (field.type === "ConnectionField") {
    lines.push(" *");
    lines.push(` * **EntryType** \`${field.entryType}\``);
  }
  if (description) {
    lines.push(` * @description ${description}`);
  }
  lines.push(` * @type {${fieldType}}`);
  if (required) {
    lines.push(` * @required ${required}`);
  }
  lines.push(` */`);

  lines.push(
    `${field.key}${required ? "" : "?"}: ${fieldType};`,
  );
  return lines.join("\n");
}

export function buildFields(
  fieldDefs: Map<string, InField>,
): Array<string> {
  const fields: string[] = [];
  fieldDefs.forEach((field) => {
    fields.push(buildField(field));
  });
  return fields;
}
