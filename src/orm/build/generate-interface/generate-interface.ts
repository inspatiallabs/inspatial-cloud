import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { EntryType } from "~/orm/entry/entry-type.ts";
import {
  formatInterfaceFile,
  writeInterfaceFile,
} from "~/orm/build/generate-interface/files-handling.ts";
import { buildFields } from "~/orm/build/generate-interface/build-fields.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";
import convertString from "~/utils/convert-string.ts";

export async function generateEntryInterface(
  orm: InSpatialORM,
  entryType: EntryType,
): Promise<void> {
  if (!entryType.dir) {
    return;
  }

  const fileName = `_${convertString(entryType.name, "kebab", true)}.type.ts`;
  const filePath = `${entryType.dir!}/${fileName}`; //`${entriesPath}/${fileName}`;

  const outLines: string[] = [
    'import type { EntryBase } from "@inspatial/cloud/types";\n',
    `export interface ${
      convertString(entryType.name, "pascal", true)
    } extends EntryBase {`,
    ` _name:"${convertString(entryType.name, "camel", true)}"`,
  ];

  const fields = buildFields(orm, entryType.fields);
  outLines.push(...fields);
  for (const child of entryType.children?.values() || []) {
    const childFields = buildFields(orm, child.fields);
    outLines.push(
      `${child.name}: ChildList<{ ${childFields.join("\n")}}>`,
    );
  }

  outLines.push("}");
  if (entryType.children?.size) {
    outLines[0] =
      'import type { EntryBase, ChildList } from "@inspatial/cloud/types";\n';
  }
  await writeInterfaceFile(filePath, outLines.join("\n"));
  await formatInterfaceFile(filePath);
}

export async function generateSettingsInterfaces(
  orm: InSpatialORM,
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

  const outLines: string[] = [
    'import type { SettingsBase }from "@inspatial/cloud/types";\n',
    `export interface ${
      convertString(settingsType.name, "pascal", true)
    } extends SettingsBase {`,
    ` _name:"${convertString(settingsType.name, "camel", true)}"`,
  ];

  const fields = buildFields(orm, settingsType.fields);
  outLines.push(...fields);
  for (const child of settingsType.children?.values() || []) {
    const childFields = buildFields(orm, child.fields);
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
