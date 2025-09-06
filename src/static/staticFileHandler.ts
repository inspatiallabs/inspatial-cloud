import type { InRequest } from "~/serve/in-request.ts";
import type { InResponse } from "~/serve/in-response.ts";
import { dateUtils } from "~/utils/date-utils.ts";
import { joinPath } from "~/utils/path-utils.ts";
import {
  faviconContent,
  getDefaultHome,
  logoContent,
  notFoundContent,
} from "./content.ts";
import { raiseServerException } from "../serve/server-exception.ts";
import type { CacheControlResponseOptions } from "../serve/types.ts";
type MaybeNullFileContent = Promise<Uint8Array<ArrayBufferLike> | null>;
export const CacheTime = {
  none: 0, // No caching
  day: 86400, // 60 * 60 * 24 = 1 day
  week: 604800, // 60 * 60 * 24 * 7 =  1 week
  month: 18144000, //  60 * 60 * 24 * 30 = 1 month
  year: 31536000, // 60 * 60 * 24 * 365 = 1 year
} as const;
/**
 * Options for the static files handler
 *
 * **`cache`** - Whether to cache files or not. Default: `true`
 *
 * **`staticFilesRoot`** - The root directory of the static files.
 */
export interface StaticFilesOptions {
  /**
   * Whether to internally cache files or not *Default*: `false`
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

  cacheHeader?: CacheControlResponseOptions;
}

export class StaticFileHandler {
  staticFilesRoot: string;
  notFoundPage?: string;
  cacheTime: typeof CacheTime[keyof typeof CacheTime] = 0;
  cacheHeader: string = "";
  cache: Map<string, { content: Uint8Array<ArrayBufferLike>; time: number }> =
    new Map();
  spa?: boolean;
  spaRootPaths: Set<string> = new Set();
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
    this.cacheHeader = this.#parseCacheOptions(
      options?.cacheHeader,
    );
  }
  #parseCacheOptions(options?: CacheControlResponseOptions) {
    const { immutable, maxAge } = options || {};
    const cacheParts: string[] = [];

    if (maxAge) {
      cacheParts.push(`max-age=${maxAge}`);
    }
    if (immutable) {
      cacheParts.push("immutable");
    }
    if (cacheParts.length > 0) {
      return cacheParts.join(", ");
    }
    return "no-store, must-revalidate";
  }
  setSpa(options: {
    enabled: boolean;
    paths?: Set<string>;
  }) {
    this.spa = options.enabled;
    if (options.paths) {
      this.spaRootPaths = options.paths;
    }
  }
  setCache(args: {
    enable?: boolean;
    cacheTime?: typeof CacheTime[keyof typeof CacheTime];
    cacheHeader?: CacheControlResponseOptions;
  }) {
    const { enable, cacheTime, cacheHeader } = args || {};
    if (enable) {
      this.cacheTime = cacheTime || CacheTime.week;
    }
    this.cacheHeader = this.#parseCacheOptions(cacheHeader);
  }
  init(relativePath: string): void {
    Deno.mkdirSync(this.staticFilesRoot, { recursive: true });
    try {
      Deno.statSync(this.staticFilesRoot + "/index.html");
    } catch (e) {
      const content = getDefaultHome({
        publicPath: relativePath,
      });
      if (e instanceof Deno.errors.NotFound) {
        Deno.writeTextFileSync(
          joinPath(this.staticFilesRoot, "index.html"),
          content,
        );
        return;
      }
      throw e;
    }
  }
  async serveFromPath(
    filePath: string,
    inResponse: InResponse,
  ): Promise<InResponse> {
    const fileName = filePath.split("/").pop();
    if (!fileName) {
      raiseServerException(
        404,
        "File not found",
      );
    }
    const fileContent = await this
      .getFile(filePath);
    if (!fileContent) {
      raiseServerException(
        404,
        "File not found",
      );
    }
    inResponse.setFile({
      fileName,
      content: fileContent,
    });
    inResponse.setCacheControl(
      this.cacheHeader,
    );
    return inResponse;
  }
  async serveFile(
    inRequest: InRequest,
    inResponse: InResponse,
  ): Promise<InResponse> {
    const path = inRequest.path;
    let fileName = inRequest.fileName || "";

    let fileContent: string | Uint8Array<ArrayBufferLike> | null;
    if (inRequest.isFile) {
      fileContent = await this
        .getFile(path);
    } else {
      // If the request is not for a file, we assume it's for a directory and try to find an index.html file in that directory.
      fileName = "index.html";
      fileContent = await this.getIndexFile(path);
    }

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
    inResponse.setCacheControl(
      this.#getCacheHeader(inRequest),
    );

    inResponse.setFile({
      fileName,
      content: fileContent,
    });

    return inResponse;
  }
  #getCacheHeader(inRequest: InRequest): string {
    if (!inRequest.isFile) {
      return "no-store, must-revalidate";
    }
    if (this.spa) {
      const regex = /\/assets\/[\w\d_-]+\.{0,1}[\w\d_-]*\.(?:js|css)$/;
      if (regex.test(inRequest.path)) {
        return this.cacheHeader;
      }
      return "no-store, must-revalidate";
    }
    return this.cacheHeader;
  }
  async serveRootIndex(): Promise<MaybeNullFileContent> {
    return await this.getFile("/index.html");
  }
  async getIndexFile(
    path: string,
  ): Promise<MaybeNullFileContent> {
    path = path.replace(/\/$/, ""); // Remove trailing slash

    if (!this.spa || path === "") {
      return await this.getFile(joinPath(path, "index.html"));
    }
    if (this.spaRootPaths.size === 0) {
      return await this.serveRootIndex();
    }
    const match = path.match(/^\/(?<root>[^\/]+)/);
    if (!match?.groups?.root) {
      return await this.serveRootIndex();
    }

    if (!this.spaRootPaths.has(match.groups.root)) {
      return await this.serveRootIndex();
    }

    return await this.getFile(joinPath(match.groups.root, "index.html"));
  }

  async getFile(
    path: string,
  ): Promise<MaybeNullFileContent> {
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
      const content = await Deno.readFile(joinPath(this.staticFilesRoot, path));
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
