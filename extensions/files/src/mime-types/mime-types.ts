import extensions from "./extensions.json" with { type: "json" };
import categories from "./categories.json" with { type: "json" };
import mimetypes from "./mimetypes.json" with { type: "json" };
import type { MimeTypeCategory } from "#extensions/files/src/mime-types/file-types.ts";

interface ExtensionInfo {
  extension: string;
  description: string;
  mimeType: string;
  category: MimeTypeCategory;
}

class MimeTypes {
  static readonly mimetypes: Array<ExtensionInfo> =
    mimetypes as unknown as Array<
      ExtensionInfo
    >;
  static readonly extensions: Map<string, ExtensionInfo> = new Map(
    Object.entries(extensions as unknown as Record<string, ExtensionInfo>),
  );
  static readonly categories: Map<string, Array<ExtensionInfo>> = new Map(
    Object.entries(
      categories as unknown as Record<string, Array<ExtensionInfo>>,
    ),
  );
  static get categoryNames(): Array<MimeTypeCategory> {
    return Array.from(this.categories.keys()) as Array<MimeTypeCategory>;
  }
  static getMimeTypeByFileName(
    fileName: string,
  ): string | undefined {
    const extension = fileName.split(".").pop();
    if (!extension) return undefined;
    return this.extensions.get(extension)?.mimeType;
  }
  static getMimeTypeByExtension(extension: string): string | undefined {
    return this.extensions.get(extension)?.mimeType;
  }

  static getCategory(extension: string): MimeTypeCategory | undefined {
    return this.extensions.get(extension)?.category;
  }
  static getDescription(extension: string): string | undefined {
    return this.extensions.get(extension)?.description;
  }

  static getExtensionsByCategory(
    category: MimeTypeCategory,
  ): Array<ExtensionInfo> | undefined {
    return this.categories.get(category);
  }

  static getExtensionsByMimeType(
    mimeType: string,
  ): ExtensionInfo | undefined {
    return this.mimetypes.find((item) => item.mimeType === mimeType);
  }
}

export default MimeTypes;
