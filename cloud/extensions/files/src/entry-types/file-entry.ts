import { EntryType } from "@inspatial/cloud";
import type { CloudFile } from "#extensions/files/src/types/cloud-file.ts";

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
    required: true,
  }, {
    key: "url",
    label: "File URL",
    type: "TextField",
    readOnly: true,
  }, {
    key: "fileType",
    label: "File Type",
    type: "ChoicesField",
    choices: [
      { label: "Image", key: "image" },
      { label: "Video", key: "video" },
      { label: "Audio", key: "audio" },
      { label: "Document", key: "document" },
      { label: "Other", key: "other" },
    ],
  }, {
    key: "mimeType",
    label: "Mime Type",
    type: "ChoicesField",
    choices: [{
      key: "application/pdf",
      label: "PDF",
    }, {
      key: "image/jpeg",
      label: "JPEG",
    }, {
      key: "image/png",
      label: "PNG",
    }, {
      key: "video/mp4",
      label: "MP4",
    }, {
      key: "audio/mpeg",
      label: "MP3",
    }, {
      key: "audio/wav",
      label: "WAV",
    }, {
      key: "application/zip",
      label: "ZIP",
    }, {
      key: "text/plain",
      label: "TXT",
    }, {
      key: "application/octet-stream",
      label: "Binary",
    }],
  }, {
    key: "filePath",
    label: "File Path",
    type: "TextField",
    required: true,
  }],
  actions: [],
  hooks: {
    beforeUpdate: [{
      name: "setFileUrl",
      handler({
        cloudFile,
      }) {
        const name = cloudFile.id;
        cloudFile.url = `/api?group=files&action=getFile&fileId=${name}`;
      },
    }],
    afterCreate: [{
      name: "setFileUrl",
      async handler({
        cloudFile,
        orm,
      }) {
        await orm.db.updateRow(
          cloudFile._entryType.config.tableName,
          cloudFile.id,
          {
            url: `/api?group=files&action=getFile&fileId=${name}`,
          },
        );
      },
    }],
    afterDelete: [{
      name: "deleteFile",
      async handler({
        cloudFile,
        orm,
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
