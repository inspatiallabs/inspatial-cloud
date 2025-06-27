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
   * **File Type** (ChoicesField)
   * @type {'audio' | 'image' | 'video' | 'document' | 'application' | 'code' | 'text' | 'font' | 'archive'}
   */
  fileType?:
    | "audio"
    | "image"
    | "video"
    | "document"
    | "application"
    | "code"
    | "text"
    | "font"
    | "archive";
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
