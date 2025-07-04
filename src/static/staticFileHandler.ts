import type { InRequest } from "../app/in-request.ts";
import type { InResponse } from "../app/in-response.ts";
import { dateUtils } from "../utils/date-utils.ts";
import { joinPath } from "../utils/path-utils.ts";
import {
  faviconContent,
  getDefaultHome,
  logoContent,
  notFoundContent,
} from "./content.ts";

const CacheTime = {
  day: 86400, // 60 * 60 * 24 = 1 day
  week: 604800, // 60 * 60 * 24 * 7 =  1 week
  month: 18144000, //  60 * 60 * 24 * 30 = 1 month
  year: 31536000, // 60 * 60 * 24 * 365 = 1 year
};
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
  staticFilesRoot: string;
  notFoundPage?: string;
  cacheTime: number;
  cache: Map<string, { content: Uint8Array<ArrayBufferLike>; time: number }> =
    new Map();
  spa?: boolean;
  defaults: {
    favicon: string;
    notFound: string;
    cloudLogo: string;
  };
  constructor(options?: StaticFilesOptions) {
    this.staticFilesRoot = options?.staticFilesRoot || Deno.cwd() + "/public";
    this.defaults = {
      cloudLogo: logoContent,
      favicon: faviconContent,
      notFound: notFoundContent,
    };
    this.cacheTime = options?.cache ? CacheTime.week : 0;
  }
  setCach(enable: boolean) {
    if (enable) {
      this.cacheTime = CacheTime.week;
      return;
    }
    this.cacheTime = 0;
  }
  async init(relativePath: string): Promise<void> {
    await Deno.mkdir(this.staticFilesRoot, { recursive: true });
    try {
      await Deno.stat(this.staticFilesRoot + "/index.html");
    } catch (e) {
      const content = getDefaultHome({
        publicPath: relativePath,
      });
      if (e instanceof Deno.errors.NotFound) {
        await Deno.writeTextFile(
          joinPath(this.staticFilesRoot, "index.html"),
          content,
        );
        return;
      }
      throw e;
    }
  }
  async serveFile(
    inRequest: InRequest,
    inResponse: InResponse,
  ): Promise<InResponse> {
    let path = inRequest.path;
    let fileName = inRequest.fileName || "index.html";
    const endsWithSlash = path.match(/\/$/);
    if (!inRequest.isFile) {
      path = `${path}${endsWithSlash ? "" : "/"}index.html`;
      if (this.spa) {
        path = "/index.html";
      }
    }

    let fileContent: string | Uint8Array<ArrayBufferLike> | null = await this
      .getFile(this.staticFilesRoot, path);
    if (!fileContent) {
      switch (fileName) {
        case "favicon.svg":
        case "favicon.ico":
          fileName = "favicon.svg";
          fileContent = this.defaults.favicon;
          break;
        default:
          fileName = "404.html";
          fileContent = this.defaults.notFound;
      }
    }

    inResponse.setFile({
      fileName,
      content: fileContent,
    });
    inResponse.setCacheControl({
      maxAge: CacheTime.week,
    });
    return inResponse;
  }
  async getFile(
    root: string,
    path: string,
  ): Promise<Uint8Array<ArrayBufferLike> | null> {
    if (this.cacheTime) {
      const cacheContent = this.cache.get(path);

      if (
        cacheContent &&
        cacheContent.time + this.cacheTime < dateUtils.nowTimestamp()
      ) {
        return cacheContent.content;
      }
    }
    try {
      const content = await Deno.readFile(joinPath(root, path));
      if (this.cacheTime) {
        this.cache.set(path, {
          content,
          time: dateUtils.nowTimestamp(),
        });
      }
      return content;
    } catch (_e) {
      if (_e instanceof Deno.errors.NotFound) {
        return null;
      }
      throw _e;
    }
  }
}
