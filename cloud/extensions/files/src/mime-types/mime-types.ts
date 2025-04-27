import extensions from "./extensions.json" with { type: "json" };
import categories from "./categories.json" with { type: "json" };
type MimeTypeCategory =
  | "audio"
  | "application"
  | "image"
  | "video"
  | "text"
  | "font";
interface ExtensionInfo {
  extension: string;
  description: string;
  mimeType: string;
  category: MimeTypeCategory;
}

class MimeTypes {
  static mimetypes: Map<string, ExtensionInfo> = new Map(
    Object.entries(extensions as unknown as Record<string, ExtensionInfo>),
  );
  static categories: Map<string, Array<ExtensionInfo>> = new Map(
    Object.entries(
      categories as unknown as Record<string, Array<ExtensionInfo>>,
    ),
  );
  static getMimeTypeByFileName(
    fileName: string,
  ): string | undefined {
    const extension = fileName.split(".").pop();
    if (!extension) return undefined;
    return this.mimetypes.get(extension)?.mimeType;
  }
  static getMimeTypeByExtension(extension: string): string | undefined {
    return this.mimetypes.get(extension)?.mimeType;
  }

  static getCategory(extension: string): MimeTypeCategory | undefined {
    return this.mimetypes.get(extension)?.category;
  }
  static getDescription(extension: string): string | undefined {
    return this.mimetypes.get(extension)?.description;
  }

  static getExtensionsByCategory(
    category: MimeTypeCategory,
  ): Array<ExtensionInfo> | undefined {
    return this.categories.get(category);
  }
}

export default MimeTypes;
