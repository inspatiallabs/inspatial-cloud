import { convertString } from "#/utils/mod.ts";
import mimetypes from "./mimetypes.json" with { type: "json" };

async function generateTypes() {
  const allData = getAllData();

  let fileTypes = "";
  let output = "";

  fileTypes += `// This file is auto-generated. Do not edit.\n`;
  fileTypes += `// Generated on ${new Date().toISOString()}\n\n`;

  fileTypes += "export type FileTypes = {\n";
  let allTypes = "export type FileType = \n";
  for (const [key, value] of Object.entries(allData)) {
    const typeName = `${convertString(key, "title")}FileType`;
    allTypes += `  | ${typeName}\n`;
    fileTypes += `  ${key}: Array<${typeName}>;\n`;
    output += `export type ${convertString(key, "title")}FileType = \n`;

    for (const item of value) {
      output += `  |  "${item}"\n`;
    }
  }
  output += `\n\n`;
  fileTypes += `};\n\n`;
  await Deno.writeTextFile("file-types.ts", fileTypes + output + allTypes);
}

async function generateExtensions() {
  const allData: Record<string, any> = {};
  for (const item of mimetypes) {
    allData[item.extension] = item;
  }
  await Deno.writeTextFile("extensions.json", JSON.stringify(allData, null, 2));
}

async function generateCategories() {
  const allData: Record<string, any> = {};
  for (const item of mimetypes) {
    if (!allData[item.category]) {
      allData[item.category] = [];
    }
    allData[item.category].push(item);
  }
  await Deno.writeTextFile("categories.json", JSON.stringify(allData, null, 2));
}

function getAllData() {
  const allData: Record<string, any> = {};
  for (const item of mimetypes) {
    if (!allData[item.category]) {
      allData[item.category] = [];
    }
    allData[item.category].push(item.extension);
  }
  return allData;
}

if (import.meta.main) {
  await generateTypes();
  await generateExtensions();
  await generateCategories();
  //
}
