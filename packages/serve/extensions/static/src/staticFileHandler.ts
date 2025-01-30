import { FileCache } from "#static/fileCache.ts";
import { inferMimeType } from "#static/mimeTypes.ts";

/**
 * Options for the static files handler
 *
 * **`cache`** - Whether to cache files or not. Default: `true`
 *
 * **`staticFilesRoot`** - The root directory of the static files.
 */
export interface StaticFilesOptions {
  /**
   * Whether to cache files or not *Default*: `true`
   */
  cache?: boolean;

  /**
   * The root directory of the static files.
   *
   * **Note:** The path should be an absolute path.
   *
   * Example:
   * ```ts
   * "/home/user/my-app/static-files"
   *  ```
   */
  staticFilesRoot: string;
}

export class StaticFileHandler {
  cache: FileCache;
  staticFilesRoot: string;
  notFoundPage?: string;
  constructor(options: StaticFilesOptions) {
    this.cache = new FileCache(!options.cache);
    this.staticFilesRoot = options.staticFilesRoot;
  }

  async serveFile(path: string): Promise<Response> {
    const isFile = inferMimeType(path);
    const endsWithSlash = path.endsWith("/");
    if (!isFile && endsWithSlash) {
      path += "index.html";
    } else if (!isFile && !endsWithSlash) {
      path += "/index.html";
    }
    path = path.replaceAll("//", "/");
    if (path.startsWith("/")) {
      path = path.slice(1);
    }

    const fileContent = await this.cache.loadFile(
      this.staticFilesRoot,
      path,
    );

    return new Response(fileContent.content, {
      status: 200,
      headers: {
        "Content-Type": fileContent.mimeType,
      },
    });
  }
}
