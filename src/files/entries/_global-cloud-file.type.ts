import type { ChildList, EntryBase as Base } from "@inspatial/cloud/types";

type GlobalCloudFileFields = {
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
   * **File Type** (ChoicesField)
   * @type {'audio' | 'image' | 'video' | 'document' | 'application' | 'code' | 'text' | 'font' | 'archive' | 'unknown'}
   * @required true
   */
  fileType:
    | "audio"
    | "image"
    | "video"
    | "document"
    | "application"
    | "code"
    | "text"
    | "font"
    | "archive"
    | "unknown";
  /**
   * **File Extension** (ChoicesField)
   * @type {'aac' | 'apng' | 'avif' | 'avi' | 'azw' | 'bin' | 'bmp' | 'csh' | 'css' | 'csv' | 'doc' | 'docx' | 'eot' | 'epub' | 'gz' | 'gif' | 'htm' | 'html' | 'ico' | 'ics' | 'jar' | 'jpeg' | 'jpg' | 'js' | 'json' | 'jsonld' | 'mid' | 'midi' | 'mjs' | 'mp3' | 'mp4' | 'mpeg' | 'mpkg' | 'odp' | 'ods' | 'odt' | 'oga' | 'ogv' | 'ogx' | 'opus' | 'otf' | 'png' | 'pdf' | 'php' | 'ppt' | 'pptx' | 'rar' | 'rtf' | 'sh' | 'svg' | 'tar' | 'tif' | 'tiff' | 'ts' | 'ttf' | 'txt' | 'wav' | 'weba' | 'webm' | 'webp' | 'woff' | 'woff2' | 'xhtml' | 'xls' | 'xlsx' | 'xml' | 'zip' | 'arc'}
   */
  fileExtension?:
    | "aac"
    | "apng"
    | "avif"
    | "avi"
    | "azw"
    | "bin"
    | "bmp"
    | "csh"
    | "css"
    | "csv"
    | "doc"
    | "docx"
    | "eot"
    | "epub"
    | "gz"
    | "gif"
    | "htm"
    | "html"
    | "ico"
    | "ics"
    | "jar"
    | "jpeg"
    | "jpg"
    | "js"
    | "json"
    | "jsonld"
    | "mid"
    | "midi"
    | "mjs"
    | "mp3"
    | "mp4"
    | "mpeg"
    | "mpkg"
    | "odp"
    | "ods"
    | "odt"
    | "oga"
    | "ogv"
    | "ogx"
    | "opus"
    | "otf"
    | "png"
    | "pdf"
    | "php"
    | "ppt"
    | "pptx"
    | "rar"
    | "rtf"
    | "sh"
    | "svg"
    | "tar"
    | "tif"
    | "tiff"
    | "ts"
    | "ttf"
    | "txt"
    | "wav"
    | "weba"
    | "webm"
    | "webp"
    | "woff"
    | "woff2"
    | "xhtml"
    | "xls"
    | "xlsx"
    | "xml"
    | "zip"
    | "arc";
  /**
   * **Mime Type** (DataField)
   * @type {string}
   */
  mimeType?: string;
  /**
   * **File Type Description** (DataField)
   * @type {string}
   */
  fileTypeDescription?: string;
  /**
   * **File Path** (TextField)
   * @type {string}
   * @required true
   */
  filePath: string;
  /**
   * **Public File** (BooleanField)
   * @description If enabled, this file can be accessed publicly without authentication.
   * @type {boolean}
   */
  publicFile: boolean;
  /**
   * **Optimize Image** (BooleanField)
   * @description If enabled, images will be optimized
   * @type {boolean}
   */
  optimizeImage: boolean;
  /**
   * **Optimized** (BooleanField)
   * @description Indicates if the image has been optimized.
   * @type {boolean}
   */
  optimized: boolean;
  /**
   * **Optimize Width** (IntField)
   * @type {number}
   */
  optimizeWidth?: number;
  /**
   * **Optimize Height** (IntField)
   * @type {number}
   */
  optimizeHeight?: number;
  /**
   * **Optimize Format** (ChoicesField)
   * @type {'jpeg' | 'png'}
   */
  optimizeFormat?: "jpeg" | "png";
  /**
   * **Has Thumbnail** (BooleanField)
   * @type {boolean}
   */
  hasThumbnail: boolean;
  /**
   * **Thumbnail Size** (IntField)
   * @type {number}
   */
  thumbnailSize?: number;
  /**
   * **Thumbnail Path** (TextField)
   * @type {string}
   */
  thumbnailPath?: string;
  /**
   * **System File** (IDField)
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
  /**
   * **Tags** (ArrayField)
   * @description Tags associated with this System File
   * @type {Array<any>}
   */
  in__tags?: Array<any>;
};
export type GlobalCloudFile = Base<GlobalCloudFileFields> & {
  _name: "globalCloudFile";
  __fields__: GlobalCloudFileFields;
  /**
   * **File Name** (DataField)
   * @type {string}
   * @required true
   */
  $fileName: string;
  /**
   * **File Size** (IntField)
   * @type {number}
   * @required true
   */
  $fileSize: number;
  /**
   * **File Type** (ChoicesField)
   * @type {'audio' | 'image' | 'video' | 'document' | 'application' | 'code' | 'text' | 'font' | 'archive' | 'unknown'}
   * @required true
   */
  $fileType:
    | "audio"
    | "image"
    | "video"
    | "document"
    | "application"
    | "code"
    | "text"
    | "font"
    | "archive"
    | "unknown";
  /**
   * **File Extension** (ChoicesField)
   * @type {'aac' | 'apng' | 'avif' | 'avi' | 'azw' | 'bin' | 'bmp' | 'csh' | 'css' | 'csv' | 'doc' | 'docx' | 'eot' | 'epub' | 'gz' | 'gif' | 'htm' | 'html' | 'ico' | 'ics' | 'jar' | 'jpeg' | 'jpg' | 'js' | 'json' | 'jsonld' | 'mid' | 'midi' | 'mjs' | 'mp3' | 'mp4' | 'mpeg' | 'mpkg' | 'odp' | 'ods' | 'odt' | 'oga' | 'ogv' | 'ogx' | 'opus' | 'otf' | 'png' | 'pdf' | 'php' | 'ppt' | 'pptx' | 'rar' | 'rtf' | 'sh' | 'svg' | 'tar' | 'tif' | 'tiff' | 'ts' | 'ttf' | 'txt' | 'wav' | 'weba' | 'webm' | 'webp' | 'woff' | 'woff2' | 'xhtml' | 'xls' | 'xlsx' | 'xml' | 'zip' | 'arc'}
   */
  $fileExtension?:
    | "aac"
    | "apng"
    | "avif"
    | "avi"
    | "azw"
    | "bin"
    | "bmp"
    | "csh"
    | "css"
    | "csv"
    | "doc"
    | "docx"
    | "eot"
    | "epub"
    | "gz"
    | "gif"
    | "htm"
    | "html"
    | "ico"
    | "ics"
    | "jar"
    | "jpeg"
    | "jpg"
    | "js"
    | "json"
    | "jsonld"
    | "mid"
    | "midi"
    | "mjs"
    | "mp3"
    | "mp4"
    | "mpeg"
    | "mpkg"
    | "odp"
    | "ods"
    | "odt"
    | "oga"
    | "ogv"
    | "ogx"
    | "opus"
    | "otf"
    | "png"
    | "pdf"
    | "php"
    | "ppt"
    | "pptx"
    | "rar"
    | "rtf"
    | "sh"
    | "svg"
    | "tar"
    | "tif"
    | "tiff"
    | "ts"
    | "ttf"
    | "txt"
    | "wav"
    | "weba"
    | "webm"
    | "webp"
    | "woff"
    | "woff2"
    | "xhtml"
    | "xls"
    | "xlsx"
    | "xml"
    | "zip"
    | "arc";
  /**
   * **Mime Type** (DataField)
   * @type {string}
   */
  $mimeType?: string;
  /**
   * **File Type Description** (DataField)
   * @type {string}
   */
  $fileTypeDescription?: string;
  /**
   * **File Path** (TextField)
   * @type {string}
   * @required true
   */
  $filePath: string;
  /**
   * **Public File** (BooleanField)
   * @description If enabled, this file can be accessed publicly without authentication.
   * @type {boolean}
   */
  $publicFile: boolean;
  /**
   * **Optimize Image** (BooleanField)
   * @description If enabled, images will be optimized
   * @type {boolean}
   */
  $optimizeImage: boolean;
  /**
   * **Optimized** (BooleanField)
   * @description Indicates if the image has been optimized.
   * @type {boolean}
   */
  $optimized: boolean;
  /**
   * **Optimize Width** (IntField)
   * @type {number}
   */
  $optimizeWidth?: number;
  /**
   * **Optimize Height** (IntField)
   * @type {number}
   */
  $optimizeHeight?: number;
  /**
   * **Optimize Format** (ChoicesField)
   * @type {'jpeg' | 'png'}
   */
  $optimizeFormat?: "jpeg" | "png";
  /**
   * **Has Thumbnail** (BooleanField)
   * @type {boolean}
   */
  $hasThumbnail: boolean;
  /**
   * **Thumbnail Size** (IntField)
   * @type {number}
   */
  $thumbnailSize?: number;
  /**
   * **Thumbnail Path** (TextField)
   * @type {string}
   */
  $thumbnailPath?: string;
  /**
   * **System File** (IDField)
   * @type {string}
   * @required true
   */
  $id: string;
  /**
   * **Created At** (TimeStampField)
   * @description The date and time this entry was created
   * @type {number}
   * @required true
   */
  $createdAt: number;
  /**
   * **Updated At** (TimeStampField)
   * @description The date and time this entry was last updated
   * @type {number}
   * @required true
   */
  $updatedAt: number;
  /**
   * **Tags** (ArrayField)
   * @description Tags associated with this System File
   * @type {Array<any>}
   */
  $in__tags?: Array<any>;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof GlobalCloudFile as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
};
