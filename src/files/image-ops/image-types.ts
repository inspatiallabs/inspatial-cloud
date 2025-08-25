export type ImageOperation = "init" | "thumbnail" | "optimize";

interface ImageMessageBase {
  id: string;
  command: ImageOperation;
}
export interface ErrorResult extends ImageMessageBase {
  success: false;
  error: string;
}

export interface ResizeThumbnailMessage extends ImageMessageBase {
  command: "thumbnail";
  size: number; // max width or height
  filePath: string;
}

export interface ThumbnailImageResult extends ImageMessageBase {
  command: "thumbnail";
  success: true;
  outputFilePath: string;
  fileSize: number;
}

export interface OptimizeImageMessage extends ImageMessageBase {
  command: "optimize";
  width: number;
  height: number;
  format: "jpeg" | "png";
  filePath: string;
  withThumbnail?: boolean;
}
export interface OptimizeImageResult extends ImageMessageBase {
  command: "optimize";
  success: true;
  newFilePath: string;
  thumbnailPath: string;
  fileSize: number;
  thumbnailSize: number;
}

interface InitMessage extends ImageMessageBase {
  command: "init";
}

interface InitResult extends ImageMessageBase {
  command: "init";
  success: boolean;
  error?: string;
}

export type ImageMessage =
  | InitMessage
  | ResizeThumbnailMessage
  | OptimizeImageMessage;

export type ImageMessageEvent = MessageEvent<ImageMessage>;

export type ImageMessageResult =
  | InitResult
  | ThumbnailImageResult
  | OptimizeImageResult;

export type ImageMessageResultEvent = MessageEvent<ImageMessageResult>;
