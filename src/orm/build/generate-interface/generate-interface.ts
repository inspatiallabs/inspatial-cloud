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

export function getBaseInterfaces(): string {
  return `
  interface EntryBase {
    _name: string;
    createdAt: number;
    /**
     * **Updated At** (TimeStampField)
     * @description The date and time this entry was last updated
     * @type {number}
     * @required true
     */
    updatedAt: number;
    /**
     * **First Name** (DataField)
     * @description The user's first name
     * @type {string}
     * @required true
     */

    save(): Promise<void>;
    /**
     * Updates the entry with the provided data. This is the preferred way to update an entry,
     * as it will only update the fields that are allowed to be changed.
     * **Note:** This does not save the entry to the database. You must call the save method to do that.
     */
    update(data: Record<string, any>): void;
    canCreate: boolean;
    canModify: boolean;
    canView(): boolean;
    canDelete(): boolean;
    assertCreatePermission(): void;
    assertModifyPermission(): void;
    assertViewPermission(): void;
    assertDeletePermission(): void;
    isFieldModified(fieldName: string): boolean;
  }
  interface SettingsBase {
    _name:string;
  }
  type BuiltInFields =
    | "id"
    | "createdAt"
    | "updatedAt"
    | "parent"
    | "order"
    | \`\${string}__title\`;

  interface ChildList<T extends Record<string, unknown>> {
    _name: string;
    rowsToRemove: Set<string>;
    _tableName: string;
    _parentId: string;
    _getFieldType: (
      fieldType: string,
    ) => any;

    data(): Array<T>;
    load(parentId: string): Promise<void>;
    /**
     * Deletes all child records for the current parent ID.
     */
    clear(): Promise<void>;
    deleteStaleRecords(): Promise<void>;
    update(data: Array<T>): void;
    getChild(id: string): T;

    add(data: Omit<T, BuiltInFields>): void;
    /** Returns the number of children, including unsaved ones */
    count: number;
    countNew(): number;
    countExisting(): number;
    save(withParentId?: string): Promise<void>;
  }


  `;
}

export async function generateEntryInterface(
  entryType: EntryType,
): Promise<void | string> {
  if (!entryType.dir) {
    return;
  }
  const className = convertString(entryType.name, "pascal", true);
  const fileName = `_${convertString(entryType.name, "kebab", true)}.type.ts`;
  const filePath = `${entryType.dir!}/${fileName}`; //`${entriesPath}/${fileName}`;
  const actionsInfo = buildActions(entryType, className);
  const outLines: string[] = [
    // 'import type { EntryBase } from "@inspatial/cloud/types";\n',
    `interface ${className} extends EntryBase {`,
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
  // if (entryType.children?.size) {
  //   outLines[0] =
  //     'import type { EntryBase, ChildList } from "@inspatial/cloud/types";\n';
  // }
  outLines.push(actionsInfo.types);
  return outLines.join("\n");
  await writeInterfaceFile(filePath, outLines.join("\n"));
  await formatInterfaceFile(filePath);
}

export async function generateSettingsInterfaces(
  settingsType: SettingsType,
): Promise<void | string> {
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
    // 'import type { SettingsBase }from "@inspatial/cloud/types";\n',
    `interface ${interfaceName} extends SettingsBase {`,
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
  // if (settingsType.children?.size) {
  //   outLines[0] =
  //     'import type { SettingsBase, ChildList } from "@inspatial/cloud/types";\n';
  // }
  return outLines.join("\n");
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
