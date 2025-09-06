import { EntryType } from "~/orm/entry/entry-type.ts";

import {
  buildField,
  buildFields,
} from "~/orm/build/generate-interface/build-fields.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";
import convertString from "~/utils/convert-string.ts";
function hashFields(fields: string[]): string[] {
  return fields.map((f) => {
    const fieldLines = f.split("\n");
    const lastLine = fieldLines.pop()!;
    fieldLines.push(`$${lastLine.trim()}`);
    return fieldLines.join("\n");
  });
}
export async function generateEntryInterface(
  entryType: EntryType,
): Promise<string> {
  const { outLines } = generateCommon(entryType);
  return outLines.join("\n");
}
export async function generateSettingsInterface(
  settingsType: SettingsType,
): Promise<string> {
  const { outLines } = generateCommon(settingsType);
  return outLines.join("\n");
}
function generateCommon(entryOrSettings: EntryType | SettingsType) {
  const es = entryOrSettings;
  const baseType = es instanceof EntryType ? "EntryBase" : "SettingsBase";
  const interfaceName = convertString(es.name, "pascal", true);
  const fileName = `_${convertString(es.name, "kebab", true)}.type.ts`;
  const filePath = `${es.dir}/${fileName}`;
  const actionsInfo = buildActions(es, interfaceName);
  const fields = buildFields(es.fields);
  const classFields = [
    `type ${interfaceName}Fields = { \n${fields.join("\n")}`,
  ];
  const outLines: string[] = [
    `export type ${interfaceName} = ${baseType}<${interfaceName}Fields> & {`,
    ` _name:"${convertString(es.name, "camel", true)}"`,
    ` __fields__: ${interfaceName}Fields;`,
    ...hashFields(fields),
  ];
  outLines.push(
    ...buildOthers(
      baseType === "EntryBase" ? "entry" : "settings",
      interfaceName,
    ),
  );
  for (const child of es.children?.values() || []) {
    const childFields = buildFields(child.fields);
    classFields.push(
      `${child.name}: ChildList<{ ${childFields.join("\n")}}>`,
    );
    outLines.push(
      `$${child.name}: ChildList<{ ${childFields.join("\n")}}>`,
    );
  }
  classFields.push("};");
  outLines.unshift(...classFields);
  outLines.push(actionsInfo.property);
  outLines.push("}");
  outLines.push(actionsInfo.types);
  return { filePath, outLines };
}

function buildOthers(forType: "entry" | "settings", interfaceName: string) {
  return [`isFieldModified(
    fieldKey: keyof {
      [K in keyof ${interfaceName} as K extends keyof ${
    forType === "entry" ? "EntryBase" : "SettingsBase"
  } ? never : K]: K;
    },
  ): boolean;`];
}
function buildActions(
  es: EntryType | SettingsType,
  className: string,
): {
  property: string;
  types: string;
} {
  if (es.actions.size === 0) {
    return {
      property: "",
      types: "",
    };
  }
  const lines: string[] = [];
  const actions = es.actions;
  const actionMap = `${className}ActionMap`;
  const paramsMap = `${className}ParamsActionMap`;

  const typeParamsLines: string[] = [`type ${className}ParamsActionMap = {`];
  const typeLines: string[] = [`type ${className}ActionMap = {`];
  let hasParamsActions = false;
  let hasNonParamsActions = false;
  for (const action of actions.values()) {
    const symbol = Deno.inspect(action.action);
    const isAsync = symbol.includes("Async");
    const returnType = (input: string): string => {
      if (isAsync) {
        return `Promise<${input}>`;
      }
      return input;
    };
    if (action.params.length == 0) {
      hasNonParamsActions = true;
      typeLines.push(...[
        `  ${action.key}: {`,
        `    return: ${returnType("any")};`,
        "  };",
      ]);
      continue;
    }
    hasParamsActions = true;
    const params: string[] = [];
    for (const param of action.params.values()) {
      const builtField = buildField(param);
      params.push(builtField);
    }
    typeParamsLines.push(
      `  ${action.key}: {`,
      `    params: {`,
      ...params,
      "    };",
      `    return: ${returnType("any")};`,
      "  };",
    );
  }
  typeLines.push("}");
  typeParamsLines.push("}");
  let types: string = "";
  if (hasNonParamsActions) {
    lines.push(...[
      `runAction<N extends keyof ${actionMap}>(`,
      "  actionName: N,",
      `): ${actionMap}[N]["return"];`,
    ]);
    types += typeLines.join("\n") + "\n";
  }
  if (hasParamsActions) {
    lines.push(...[
      `runAction<N extends keyof ${paramsMap}>(`,
      "  actionName: N,",
      `  params: ${paramsMap}[N]["params"],`,
      `): ${paramsMap}[N]["return"];`,
    ]);
    types += typeParamsLines.join("\n") + "\n";
  }

  return {
    property: lines.join("\n"),
    types,
  };
}
