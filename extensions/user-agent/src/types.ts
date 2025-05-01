export type ProcessingFn = (value: string) => string | undefined;

export type MatchingTupleProp = [
  matchers: [RegExp, ...RegExp[]],
  processors: (
    | string
    | [string, string]
    | [string, ProcessingFn]
    | [string, RegExp, string]
    | [string, RegExp, string, ProcessingFn]
  )[],
];

export interface Matchers {
  browser: MatchingTupleProp[];
  cpu: MatchingTupleProp[];
  device: MatchingTupleProp[];
  engine: MatchingTupleProp[];
  os: MatchingTupleProp[];
}

/** The browser as described by a user agent string. */
export interface BrowserProp {
  /** The major version of a browser. */
  readonly major: string | undefined;
  /** The name of a browser. */
  readonly name: string | undefined;
  /** The version of a browser. */
  readonly version: string | undefined;
}

/** The device as described by a user agent string. */
export interface DeviceProp {
  readonly model: string | undefined;
  readonly type:
    | "console"
    | "embedded"
    | "mobile"
    | "tablet"
    | "smarttv"
    | "wearable"
    | "headMounted"
    | undefined;
  readonly vendor: string | undefined;
}

/** The browser engine as described by a user agent string. */
export interface EngineProp {
  /** The browser engine name. */
  readonly name: string | undefined;
  /** The browser engine version. */
  readonly version: string | undefined;
}

/** The OS as described by a user agent string. */
export interface PlatformOSProp {
  /** The OS name. */
  readonly name: string | undefined;
  /** The OS version. */
  readonly version: string | undefined;
}

/** The CPU information as described by a user agent string. */
export interface CPUProp {
  /** The CPU architecture.  */
  readonly architecture: string | undefined;
}

export interface ParsedUserAgentProp {
  platformOS: {
    name: string;
    version?: string;
    family?:
      | "Windows"
      | "macOS"
      | "Linux"
      | "iOS"
      | "Android"
      | "AndroidXR"
      | "HorizonOS"
      | "visionOS"
      | "Unknown";
  };
  browser: {
    name: string;
    version?: string;
    major?: string;
    isHeadless?: boolean;
    isMobile?: boolean;
  };
  device: {
    type:
      | "mobile"
      | "tablet"
      | "desktop"
      | "console"
      | "smarttv"
      | "wearable"
      | "embedded"
      | "headMounted";
    vendor?: string;
    model?: string;
    isBot?: boolean;
  };
  engine?: {
    name?: string;
    version?: string;
  };
  cpu?: {
    architecture?: string;
  };
}
