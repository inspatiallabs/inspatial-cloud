import { EntryType } from "@inspatial/cloud";
import type { CloudFile } from "#extensions/files/src/types/cloud-file.ts";
import MimeTypes from "#extensions/files/src/mime-types/mime-types.ts";
import { convertString } from "~/utils/mod.ts";

const fileEntry = new EntryType<CloudFile>("cloudFile", {
  label: "File",
  titleField: "fileName",
  defaultListFields: ["fileName", "fileType", "fileSize"],
  fields: [{
    key: "fileName",
    label: "File Name",
    type: "DataField",
    required: true,
  }, {
    key: "fileSize",
    label: "File Size",
    format: "fileSize",
    type: "IntField",
    readOnly: true,
    required: true,
  }, {
    key: "fileType",
    label: "File Type",
    readOnly: true,
    type: "ChoicesField",
    choices: MimeTypes.categoryNames.map((category) => ({
      key: category,
      label: convertString(category, "title"),
    })),
  }, {
    key: "fileExtension",
    label: "File Extension",
    readOnly: true,
    type: "ChoicesField",
    choices: MimeTypes.mimetypes.map((mimeType) => ({
      key: mimeType.extension,
      label: mimeType.extension.toUpperCase(),
    })),
  }, {
    key: "mimeType",
    label: "Mime Type",
    readOnly: true,
    type: "DataField",
  }, {
    key: "fileTypeDescription",
    label: "File Type Description",
    readOnly: true,
    type: "DataField",
  }, {
    key: "filePath",
    label: "File Path",
    type: "TextField",
    hidden: true,
    readOnly: true,
    required: true,
  }],
  hooks: {
    afterDelete: [{
      name: "deleteFile",
      async handler({
        cloudFile,
      }) {
        const path = cloudFile.filePath;
        try {
          await Deno.remove(path);
        } catch (e) {
          if (e instanceof Deno.errors.NotFound) {
            console.warn("File not found for deletion:", path);
            return;
          }
          throw e;
        }
      },
    }],
  },
});

export default fileEntry;
