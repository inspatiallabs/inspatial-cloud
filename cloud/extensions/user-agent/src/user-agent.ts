import type {
  BrowserProp,
  CPUProp,
  DeviceProp,
  EngineProp,
  PlatformOSProp,
} from "#extensions/user-agent/src/types.ts";
import { majorize, mapper } from "#extensions/user-agent/src/helpers.ts";
import { matchers } from "#extensions/user-agent/src/matchers.ts";

/**
 * # UserAgent
 * #### A powerful tool for understanding who's visiting your web application
 *
 * The `UserAgent` class helps you understand details about your users' browsers, devices, and operating systems by analyzing
 * their user agent string - think of it like a digital ID card that browsers present when visiting your website.
 *
 * @since 0.0.1
 * @category InSpatial Run
 * @module UserAgent
 * @kind class
 * @access public
 *
 * ### 💡 Core Concepts
 * - Parses user agent strings to extract useful information
 * - Provides details about browser, OS, device, CPU, and engine
 * - Uses lazy loading for better performance
 *
 * ### 📚 Terminology
 * > **User Agent String**: A text identifier that browsers send to websites, containing information about the browser,
 *   operating system, and device being used.
 * > **Lazy Loading**: A design pattern where we only compute values when they're first needed, rather than all at once.
 *
 * ### 📝 Type Definitions
 * ```typescript
 * interface BrowserProp {
 *   readonly major: string | undefined;    // Major version number of the browser
 *   readonly name: string | undefined;     // Name of the browser
 *   readonly version: string | undefined;  // Full version string of the browser
 * }
 *
 * interface DeviceProp {
 *   readonly model: string | undefined;    // Device model name
 *   readonly type: "console" | "embedded" | "mobile" | "tablet" | "smarttv" | "wearable" | undefined;
 *   readonly vendor: string | undefined;   // Device manufacturer
 * }
 *
 * // ... other interfaces
 * ```
 *
 * ### 🎮 Usage
 *
 * @example
 * ### Example 1: Basic Browser Detection
 * ```typescript
 * import { UserAgent } from "@inspatial/serve";
 *
 * // Create a new UserAgent instance from a user agent string
 * const ua = new UserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X)");
 *
 * // Get browser information
 * console.log(ua.browser.name);    // Output: "Safari"
 * console.log(ua.browser.version); // Output: "14.4"
 * ```
 *
 * @example
 * ### Example 2: Device Type Detection
 * ```typescript
 * import { UserAgent } from "@inspatial/serve";
 *
 * function isUserOnMobile(userAgentString: string) {
 *   const ua = new UserAgent(userAgentString);
 *   return ua.device.type === 'mobile';
 * }
 *
 * // Use it in your application
 * if (isUserOnMobile(request.headers.get("user-agent"))) {
 *   // Show mobile-optimized content
 * }
 * ```
 *
 * ### ⚡ Performance Tips
 * <details>
 * <summary>Click to learn about performance</summary>
 *
 * - The class uses lazy loading - properties are only parsed when first accessed
 * - Cache the UserAgent instance if you'll need it multiple times
 * - Avoid creating new instances unnecessarily
 * </details>
 *
 * ### ❌ Common Mistakes
 * <details>
 * <summary>Click to see what to avoid</summary>
 *
 * - Don't rely solely on user agent detection for critical functionality
 * - Remember that user agent strings can be spoofed
 * - Avoid creating new instances for each request - cache when possible
 * </details>
 *
 * @param {string | null} ua - The user agent string to parse. If null is provided,
 *                            an empty string will be used.
 *
 * @returns {UserAgent} A new UserAgent instance that provides methods to access
 *                      parsed information about the browser, device, and system.
 *
 * ### 🔧 Runtime Support
 * - ✅ Node.js
 * - ✅ Deno
 * - ✅ Bun
 *
 * ### 🔗 Related Resources
 *
 * #### Internal References
 * - {@link BrowserProp} - Browser information interface
 * - {@link DeviceProp} - Device information interface
 * - {@link PlatformOSProp} - Operating system information interface
 */
export class UserAgent {
  private _browser: BrowserProp | undefined;
  private _cpu: CPUProp | undefined;
  private _device: DeviceProp | undefined;
  private _engine: EngineProp | undefined;
  private _platformOS: PlatformOSProp | undefined;
  private _ua: string;

  /**
   * Constructs a new instance.
   *
   * @param ua The user agent string to construct this instance with.
   */
  constructor(ua: string | null) {
    this._ua = ua ?? "";
  }

  /**
   * The name and version of the browser extracted from the user agent
   * string.
   *
   * @example Usage
   * ```ts ignore
   * import { UserAgent } from "@inspatial/serve";
   *
   * Deno.serve((req) => {
   *   const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
   *   return new Response(`Hello, ${userAgent.browser.name}!`);
   * });
   * ```
   *
   * @returns An object with information about the user agent's browser.
   */
  get browser(): BrowserProp {
    if (!this._browser) {
      this._browser = { name: undefined, version: undefined, major: undefined };
      mapper(this._browser, this._ua, matchers.browser);
      // deno-lint-ignore no-explicit-any
      (this._browser as any).major = majorize(this._browser.version);
      Object.freeze(this._browser);
    }
    return this._browser;
  }

  /**
   * The architecture of the CPU extracted from the user agent string.
   *
   * @example Usage
   * ```ts ignore
   * import { UserAgent } from "@inspatial/serve";
   *
   * Deno.serve((req) => {
   *   const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
   *   return new Response(`Hello, ${userAgent.cpu.architecture}!`);
   * });
   * ```
   *
   * @returns An object with information about the user agent's CPU.
   */
  get cpu(): CPUProp {
    if (!this._cpu) {
      this._cpu = { architecture: undefined };
      mapper(this._cpu, this._ua, matchers.cpu);
      Object.freeze(this._cpu);
    }
    return this._cpu;
  }

  /**
   * The model, type, and vendor of a device if present in a user agent
   * string.
   *
   * @example Usage
   * ```ts ignore
   * import { UserAgent } from "@inspatial/serve";
   *
   * Deno.serve((req) => {
   *   const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
   *   return new Response(`Hello, ${userAgent.device.model}!`);
   * });
   * ```
   *
   * @returns An object with information about the user agent's device.
   */
  get device(): DeviceProp {
    if (!this._device) {
      this._device = { model: undefined, type: undefined, vendor: undefined };
      mapper(this._device, this._ua, matchers.device);
      Object.freeze(this._device);
    }
    return this._device;
  }

  /**
   * The name and version of the browser engine in a user agent string.
   *
   * @example Usage
   * ```ts ignore
   * import { UserAgent } from "@inspatial/serve";
   *
   * Deno.serve((req) => {
   *   const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
   *   return new Response(`Hello, ${userAgent.engine.name}!`);
   * });
   * ```
   *
   * @returns An object with information about the user agent's browser engine.
   */
  get engine(): EngineProp {
    if (!this._engine) {
      this._engine = { name: undefined, version: undefined };
      mapper(this._engine, this._ua, matchers.engine);
      Object.freeze(this._engine);
    }
    return this._engine;
  }

  /**
   * The name and version of the operating system in a user agent string.
   *
   * @example Usage
   * ```ts ignore
   * import { UserAgent } from "@inspatial/serve";
   *
   * Deno.serve((req) => {
   *   const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
   *   return new Response(`Hello, ${userAgent.os.name}!`);
   * });
   * ```
   *
   * @returns An object with information about the user agent's OS.
   */
  get platformOS(): PlatformOSProp {
    if (!this._platformOS) {
      this._platformOS = { name: undefined, version: undefined };
      mapper(this._platformOS, this._ua, matchers.os);
      Object.freeze(this._platformOS);
    }
    return this._platformOS;
  }

  /**
   * A read only version of the user agent string related to the instance.
   *
   * @example Usage
   * ```ts ignore
   * import { UserAgent } from "@inspatial/serve";
   *
   * Deno.serve((req) => {
   *   const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
   *   return new Response(`Hello, ${userAgent.ua}!`);
   * });
   * ```
   *
   * @returns The user agent string.
   */
  get ua(): string {
    return this._ua;
  }

  /**
   * Converts the current instance to a JSON representation.
   *
   * @example Usage
   * ```ts ignore
   * import { UserAgent } from "@inspatial/serve";
   *
   * Deno.serve((req) => {
   *   const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
   *   return new Response(`Hello, ${JSON.stringify(userAgent.toJSON())}!`);
   * });
   * ```
   *
   * @returns A JSON representation on this user agent instance.
   */
  toJSON(): {
    browser: BrowserProp;
    cpu: CPUProp;
    device: DeviceProp;
    engine: EngineProp;
    os: PlatformOSProp;
    ua: string;
  } {
    const { browser, cpu, device, engine, platformOS: os, ua } = this;
    return { browser, cpu, device, engine, os, ua };
  }

  /**
   * Converts the current instance to a string.
   *
   * @example Usage
   * ```ts ignore
   * import { UserAgent } from "@inspatial/serve";
   *
   * Deno.serve((req) => {
   *   const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
   *   return new Response(`Hello, ${userAgent.toString()}!`);
   * });
   * ```
   *
   * @returns The user agent string.
   */
  toString(): string {
    return this._ua;
  }

  /**
   * Custom output for {@linkcode Deno.inspect}.
   *
   * @example Usage
   * ```ts ignore
   * import { UserAgent } from "@inspatial/serve";
   *
   * Deno.serve((req) => {
   *   const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
   *   Deno.inspect(userAgent);
   *   return new Response(`Hello, ${userAgent.ua}!`);
   * });
   * ```
   *
   * @param inspect internal inspect function.
   *
   * @returns The custom value to inspect.
   */
  [Symbol.for("Deno.customInspect")](
    inspect: (value: unknown) => string,
  ): string {
    const { browser, cpu, device, engine, platformOS: os, ua } = this;
    return `${this.constructor.name} ${
      inspect({
        browser,
        cpu,
        device,
        engine,
        os,
        ua,
      })
    }`;
  }

  /**
   * Custom output for Node's
   * {@linkcode https://nodejs.org/api/util.html#utilinspectobject-options | util.inspect}.
   *
   * @example Usage
   * ```ts ignore
   * import { UserAgent } from "@inspatial/serve";
   * import { inspect } from "node:util";
   *
   * Deno.serve((req) => {
   *   const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
   *   inspect(userAgent);
   *   return new Response(`Hello, ${userAgent.ua}!`);
   * });
   * ```
   *
   * @param depth internal inspect depth.
   * @param options internal inspect option.
   * @param inspect internal inspect function.
   *
   * @returns The custom value to inspect.
   */
  [Symbol.for("nodejs.util.inspect.custom")](
    depth: number,
    // deno-lint-ignore explicit-module-boundary-types
    options: any,
    inspect: (value: unknown, options?: unknown) => string,
  ): string {
    if (depth < 0) {
      return options.stylize(`[${this.constructor.name}]`, "special");
    }

    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1,
    });
    const { browser, cpu, device, engine, platformOS: os, ua } = this;
    return `${options.stylize(this.constructor.name, "special")} ${
      inspect(
        { browser, cpu, device, engine, os, ua },
        newOptions,
      )
    }`;
  }
}
