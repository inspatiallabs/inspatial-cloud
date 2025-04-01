import type { InSpatialORM } from "#/inspatial-orm.ts";
import type { EntryType } from "#/entry/entry-type.ts";
import { convertString } from "@inspatial/serve/utils";
import {
  formatInterfaceFile,
  writeInterfaceFile,
} from "#/build/generate-interface/files-handling.ts";
import { buildFields } from "#/build/generate-interface/build-fields.ts";
import type { SettingsType } from "#/settings/settings-type.ts";

export async function generateEntryInterface(
  orm: InSpatialORM,
  entryType: EntryType,
  entriesPath: string,
): Promise<void> {
  await Deno.mkdir(entriesPath, { recursive: true });

  const fileName = `${convertString(entryType.name, "kebab", true)}.ts`;
  const filePath = `${entriesPath}/${fileName}`;

  const outLines: string[] = [
    'import type { EntryBase } from "@inspatial/orm/types";',
    `export interface ${
      convertString(entryType.name, "pascal", true)
    } extends EntryBase {`,
    ` _name:"${convertString(entryType.name, "camel", true)}"`,
  ];

  const fields = buildFields(orm, entryType.fields);
  outLines.push(...fields);

  outLines.push("}");
  await writeInterfaceFile(filePath, outLines.join("\n"));
  await formatInterfaceFile(filePath);
}

export async function generateSettingsInterfaces(
  orm: InSpatialORM,
  settingsType: SettingsType,
  settingsPath: string,
): Promise<void> {
  await Deno.mkdir(settingsPath, { recursive: true });

  const fileName = `${convertString(settingsType.name, "kebab", true)}.ts`;
  const filePath = `${settingsPath}/${fileName}`;

  const outLines: string[] = [
    'import type { SettingsBase }from "@inspatial/orm/types";',
    `export interface ${
      convertString(settingsType.name, "pascal", true)
    } extends SettingsBase {`,
    ` _name:"${convertString(settingsType.name, "camel", true)}"`,
  ];

  const fields = buildFields(orm, settingsType.fields);
  outLines.push(...fields);

  outLines.push("}");
  await writeInterfaceFile(filePath, outLines.join("\n"));
  await formatInterfaceFile(filePath);
}
