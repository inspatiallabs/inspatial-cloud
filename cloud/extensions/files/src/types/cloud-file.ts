import type { EntryBase } from "@inspatial/cloud/types";
export interface CloudFile extends EntryBase {
  _name: "cloudFile";
  /**
   * **File Name** (DataField)
   * @type {string}
   * @required true
   */
  fileName: string;
  /**
   * **File Size** (IntField)
   * @type {number}
   * @required true
   */
  fileSize: number;
  /**
   * **File URL** (TextField)
   * @type {string}
   */
  url?: string;
  /**
   * **File Type** (ChoicesField)
   * @type {'image' | 'video' | 'audio' | 'document' | 'other'}
   */
  fileType?: "image" | "video" | "audio" | "document" | "other";
  /**
   * **Mime Type** (ChoicesField)
   * @type {'application/pdf' | 'image/jpeg' | 'image/png' | 'video/mp4' | 'audio/mpeg' | 'audio/wav' | 'application/zip' | 'text/plain' | 'application/octet-stream'}
   */
  mimeType?:
    | "application/pdf"
    | "image/jpeg"
    | "image/png"
    | "video/mp4"
    | "audio/mpeg"
    | "audio/wav"
    | "application/zip"
    | "text/plain"
    | "application/octet-stream";
  /**
   * **File Path** (TextField)
   * @type {string}
   * @required true
   */
  filePath: string;
  /**
   * **File** (IDField)
   * @type {string}
   * @required true
   */
  id: string;
  /**
   * **Created At** (TimeStampField)
   * @description The date and time this entry was created
   * @type {number}
   * @required true
   */
  createdAt: number;
  /**
   * **Updated At** (TimeStampField)
   * @description The date and time this entry was last updated
   * @type {number}
   * @required true
   */
  updatedAt: number;
}
