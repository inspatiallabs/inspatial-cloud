/// <reference lib="webworker" />

import { joinPath } from "../../utils/path-utils.ts";
import type {
  ErrorResult,
  ImageMessageEvent,
  ImageMessageResult,
  ImageOperation,
} from "./image-types.ts";
import {
  resize_image_to_jpg,
  resize_image_to_png,
} from "./resize/img-resize.ts";

const resizeImage = {
  toJpg: resize_image_to_jpg,
  toPng: resize_image_to_png,
};

const sendResult = (result: ImageMessageResult | ErrorResult) => {
  self.postMessage(result);
};

type CommandHandler<K extends ImageOperation> = (
  msg: Extract<ImageMessageEvent["data"], { command: K }>,
) => Promise<
  Extract<ImageMessageResult, { command: K }> | ErrorResult
>;

const commandHandlers: {
  [K in ImageOperation]: CommandHandler<K>;
} = {
  init: async (msg) => {
    return await new Promise((resolve) => {
      resolve(
        {
          id: msg.id,
          success: true,
          command: "init",
        },
      );
    });
  },
  async thumbnail(msg) {
    const { filePath, size } = msg;
    const fileData = await Deno.readFile(filePath);
    const resized = resizeImage.toJpg(fileData, size, size);
    if (!resized) {
      return {
        command: "thumbnail",
        id: msg.id,
        success: false,
        error: "Failed to create thumbnail",
        fileSize: 0,
        outputFilePath: "",
      };
    }
    const parts = filePath.split("/");
    const fileName = parts.pop()?.split(".").shift();
    const outputFilePath = `${parts.join("/")}/thumb-${fileName}.jpg`;
    await Deno.writeFile(outputFilePath, resized);
    return {
      command: "thumbnail",
      id: msg.id,
      success: true,
      fileSize: resized.byteLength,
      outputFilePath,
    };
  },
  async optimize(msg) {
    const { filePath, width, height, format } = msg;
    let resized: Uint8Array | null = null;
    const pathParts = filePath.split("/");
    const fileName = pathParts.pop()!;
    const originalsDir = joinPath(...pathParts, "original");
    const originalPath = joinPath(originalsDir, fileName);
    const fileData = await Deno.readFile(originalPath);
    switch (format) {
      case "jpeg":
        resized = resizeImage.toJpg(fileData, width, height);
        break;
      case "png":
        resized = resizeImage.toPng(fileData, width, height);
        break;
    }
    let thumbnail: Uint8Array | null = null;
    let thumbPath = "";
    if (msg.withThumbnail) {
      thumbnail = resizeImage.toJpg(fileData, 200, 200);
      thumbPath = filePath.replace(
        /\.[^.]+$/,
        `-thumb.jpg`,
      );
      if (thumbnail) {
        await Deno.writeFile(thumbPath, thumbnail);
      }
    }
    if (!resized) {
      return {
        command: "optimize",
        id: msg.id,
        success: false,
        error: "Failed to resize image",
      };
    }
    const outputFilePath = filePath.replace(
      /\.[^.]+$/,
      `.${format === "jpeg" ? "jpg" : "png"}`,
    );

    await Deno.writeFile(outputFilePath, resized);
    await Deno.remove(originalPath);

    return {
      command: "optimize",
      id: msg.id,
      success: true,
      fileSize: resized.byteLength,
      newFilePath: outputFilePath,
      thumbnailPath: thumbnail ? thumbPath : "",
      thumbnailSize: thumbnail ? thumbnail.byteLength : 0,
    };
  },
};

function getCommandHandler<K extends ImageOperation>(
  command: K,
): CommandHandler<K> {
  return commandHandlers[command];
}
self.onmessage = async (evt: ImageMessageEvent) => {
  const msg = evt.data;
  const { command } = msg;
  const handler = getCommandHandler(command);
  try {
    const result = await handler(msg);

    sendResult(result);
  } catch (e) {
    sendResult({
      command: msg.command,
      id: msg.id,
      success: false,
      error: (e as Error).message,
    });
  }
};
