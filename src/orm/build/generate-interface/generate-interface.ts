import type { EntryType } from "~/orm/entry/entry-type.ts";
import {
  formatInterfaceFile,
  writeInterfaceFile,
} from "~/orm/build/generate-interface/files-handling.ts";
import {
  buildField,
  buildFields,
} from "~/orm/build/generate-interface/build-fields.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";
import convertString from "~/utils/convert-string.ts";

export async function generateEntryInterface(
  entryType: EntryType,
): Promise<void> {
  if (!entryType.dir) {
    return;
  }
  const className = convertString(entryType.name, "pascal", true);
  const fileName = `_${convertString(entryType.name, "kebab", true)}.type.ts`;
  const filePath = `${entryType.dir!}/${fileName}`; //`${entriesPath}/${fileName}`;
  const actionsInfo = buildActions(entryType, className);
  const outLines: string[] = [
    'import type { EntryBase } from "@inspatial/cloud/types";\n',
    `export interface ${className} extends EntryBase {`,
    ` _name:"${convertString(entryType.name, "camel", true)}"`,
  ];

  const fields = buildFields(entryType.fields);
  outLines.push(...fields);
  outLines.push(...buildOthers("entry", className));
  for (const child of entryType.children?.values() || []) {
    const childFields = buildFields(child.fields);
    outLines.push(
      `${child.name}: ChildList<{ ${childFields.join("\n")}}>`,
    );
  }
  outLines.push(actionsInfo.property);
  outLines.push("}");
  if (entryType.children?.size) {
    outLines[0] =
      'import type { EntryBase, ChildList } from "@inspatial/cloud/types";\n';
  }
  outLines.push(actionsInfo.types);
  await writeInterfaceFile(filePath, outLines.join("\n"));
  await formatInterfaceFile(filePath);
}

export async function generateSettingsInterfaces(
  settingsType: SettingsType,
): Promise<void> {
  if (!settingsType.dir) {
    return;
  }
  const settingsPath = settingsType.dir;

  const fileName = `_${
    convertString(settingsType.name, "kebab", true)
  }.type.ts`;
  const filePath = `${settingsPath}/${fileName}`;
  const interfaceName = convertString(settingsType.name, "pascal", true);
  const outLines: string[] = [
    'import type { SettingsBase }from "@inspatial/cloud/types";\n',
    `export interface ${interfaceName} extends SettingsBase {`,
    ` _name:"${convertString(settingsType.name, "camel", true)}"`,
  ];

  const fields = buildFields(settingsType.fields);
  outLines.push(...fields);
  outLines.push(...buildOthers("settings", interfaceName));
  for (const child of settingsType.children?.values() || []) {
    const childFields = buildFields(child.fields);
    outLines.push(
      `${child.name}: ChildList<{ ${childFields.join("\n")}}>`,
    );
  }
  outLines.push("}");
  if (settingsType.children?.size) {
    outLines[0] =
      'import type { SettingsBase, ChildList } from "@inspatial/cloud/types";\n';
  }
  await writeInterfaceFile(filePath, outLines.join("\n"));
  await formatInterfaceFile(filePath);
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
  entryType: EntryType,
  className: string,
): {
  property: string;
  types: string;
} {
  if (entryType.actions.size === 0) {
    return {
      property: "",
      types: "",
    };
  }
  const lines: string[] = [];
  const actions = entryType.actions;
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
