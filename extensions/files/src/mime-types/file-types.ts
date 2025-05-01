// This file is auto-generated. Do not edit.
// Generated on 2025-04-27T16:05:14.575Z

export type MimeTypeCategory = keyof FileTypes;
export type FileTypes = {
  audio: Array<AudioFileType>;
  image: Array<ImageFileType>;
  video: Array<VideoFileType>;
  document: Array<DocumentFileType>;
  application: Array<ApplicationFileType>;
  code: Array<CodeFileType>;
  text: Array<TextFileType>;
  font: Array<FontFileType>;
  archive: Array<ArchiveFileType>;
};

export type AudioFileType =
  | "aac"
  | "mid"
  | "midi"
  | "mp3"
  | "oga"
  | "opus"
  | "wav"
  | "weba";
export type ImageFileType =
  | "apng"
  | "avif"
  | "bmp"
  | "gif"
  | "ico"
  | "jpeg"
  | "jpg"
  | "png"
  | "svg"
  | "tif"
  | "tiff"
  | "webp";
export type VideoFileType =
  | "avi"
  | "mp4"
  | "mpeg"
  | "ogv"
  | "ts"
  | "webm"
  | "3gp"
  | "3g2";
export type DocumentFileType =
  | "azw"
  | "csv"
  | "doc"
  | "docx"
  | "epub"
  | "odp"
  | "ods"
  | "odt"
  | "pdf"
  | "ppt"
  | "pptx"
  | "rtf"
  | "xls"
  | "xlsx";
export type ApplicationFileType =
  | "bin"
  | "jsonld"
  | "mpkg"
  | "ogx"
  | "xhtml";
export type CodeFileType =
  | "csh"
  | "js"
  | "json"
  | "mjs"
  | "php"
  | "sh"
  | "xml";
export type TextFileType =
  | "css"
  | "htm"
  | "html"
  | "ics"
  | "txt";
export type FontFileType =
  | "eot"
  | "otf"
  | "ttf"
  | "woff"
  | "woff2";
export type ArchiveFileType =
  | "gz"
  | "jar"
  | "rar"
  | "tar"
  | "zip"
  | "7z"
  | "arc";

export type FileType =
  | AudioFileType
  | ImageFileType
  | VideoFileType
  | DocumentFileType
  | ApplicationFileType
  | CodeFileType
  | TextFileType
  | FontFileType
  | ArchiveFileType;
