import { EntryType } from "@inspatial/cloud";

import { convertString } from "~/utils/mod.ts";
import MimeTypes from "../mime-types/mime-types.ts";
import type { InCloud } from "../../in-cloud.ts";
import type { InSpatialORM } from "../../orm/mod.ts";
import type { CloudFile, GlobalCloudFile } from "#types/models.ts";
import { defineEntry } from "../../orm/entry/entry-type.ts";
const config = {
  label: "File",
  titleField: "fileName",
  defaultListFields: [
    "fileName",
    "fileType",
    "fileSize",
    "publicFile",
    "fileExtension",
  ],
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
    required: true,
    defaultValue: "unknown",
    type: "ChoicesField",
    choices: [
      ...MimeTypes.categoryNames.map((category) => ({
        key: category,
        label: convertString(category, "title"),
      })),
      {
        key: "unknown",
        label: "Unknown",
      },
    ],
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
    hidden: false,
    readOnly: true,
    required: true,
  }, {
    key: "publicFile",
    type: "BooleanField",
    label: "Public File",
    readOnly: true,
    description:
      "If enabled, this file can be accessed publicly without authentication.",
  }, {
    key: "optimizeImage",
    type: "BooleanField",
    description: "If enabled, images will be optimized",
  }, {
    key: "optimized",
    type: "BooleanField",
    label: "Optimized",
    readOnly: true,
    description: "Indicates if the image has been optimized.",
  }, {
    key: "optimizeWidth",
    type: "IntField",
  }, {
    key: "optimizeHeight",
    type: "IntField",
  }, {
    key: "optimizeFormat",
    type: "ChoicesField",
    choices: [
      { key: "jpeg", label: "JPEG" },
      { key: "png", label: "PNG" },
    ],
  }, {
    key: "hasThumbnail",
    type: "BooleanField",
    readOnly: true,
  }, {
    key: "thumbnailSize",
    type: "IntField",
    format: "fileSize",
    readOnly: true,
  }, {
    key: "thumbnailPath",
    type: "TextField",
    hidden: true,
    readOnly: true,
  }],
  hooks: {
    afterDelete: [{
      name: "deleteFile",
      async handler({
        entry,
        inCloud,
      }: {
        entry: CloudFile | GlobalCloudFile;
        inCloud: InCloud;
      }) {
        const path = entry.$filePath;
        try {
          await Deno.remove(path);
        } catch (e) {
          if (e instanceof Deno.errors.NotFound) {
            inCloud.inLog.warn(["File not found for deletion:", path]);
            return;
          }
          throw e;
        }
      },
    }],
    afterUpdate: [{
      name: "optimizeImage",
      handler({
        entry,
        inCloud,
        orm,
      }: {
        entry: CloudFile | GlobalCloudFile;
        orm: InSpatialORM;
        inCloud: InCloud;
      }) {
        if (entry.isFieldModified("optimizeImage") && entry.$optimizeImage) {
          inCloud.inQueue.send({
            command: "optimizeImage",
            data: {
              format: entry.$optimizeFormat || "jpeg",
              height: entry.$optimizeHeight || 1000,
              width: entry.$optimizeWidth || 1000,
              inputFilePath: entry.$filePath,
              fileId: entry.$id,
              title: entry.$fileName,
              withThumbnail: true,
              accountId: entry._entryType.systemGlobal
                ? undefined
                : orm._accountId,
            },
          });
        }
      },
    }],
  },
} as any;
export const cloudFile = defineEntry("cloudFile", config);
cloudFile.addAction("getContent", {
  private: true,
  params: [{
    key: "asText",
    label: "As String",
    type: "BooleanField",
    description: "Return the content as a string instead of a byte array",
  }],
  async action({ cloudFile, inCloud, params }) {
    try {
      if (params.asText) {
        return await Deno.readTextFile(cloudFile.$filePath);
      }
      return await Deno.readFile(cloudFile.$filePath);
    } catch (e) {
      inCloud.inLog.error("Error reading file", {
        stackTrace: e instanceof Error ? e.stack : undefined,
        subject: "cloudFile.getContent",
      });
      return { success: false, message: "Error reading file" };
    }
  },
});
export const globalCloudFile = defineEntry(
  "globalCloudFile",
  {
    ...config,
    label: "System File",
    description: "A shared system file",
    systemGlobal: true,
  },
);

globalCloudFile.addAction("getContent", {
  private: true,
  params: [{
    key: "asText",
    label: "As String",
    type: "BooleanField",
    description: "Return the content as a string instead of a byte array",
  }],
  async action({ globalCloudFile, inCloud, params }) {
    try {
      if (params.asText) {
        return await Deno.readTextFile(globalCloudFile.$filePath);
      }
      return await Deno.readFile(globalCloudFile.$filePath);
    } catch (e) {
      inCloud.inLog.error("Error reading file", {
        stackTrace: e instanceof Error ? e.stack : undefined,
        subject: "cloudFile.getContent",
      });
      return { success: false, message: "Error reading file" };
    }
  },
});
