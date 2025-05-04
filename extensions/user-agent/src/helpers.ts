// deno-lint-ignore-file

import { EMPTY } from "#extensions/user-agent/src/matchers.ts";
import { MatchingTupleProp } from "#extensions/user-agent/src/types.ts";

export function lowerize(str: string): string {
  return str.toLowerCase();
}

export function majorize(str: string | undefined): string | undefined {
  return str ? str.replace(/[^\d\.]/g, EMPTY).split(".")[0] : undefined;
}

export function trim(str: string): string {
  return str.trimStart();
}

/** A map where the key is the common Windows version and the value is a string
 * or array of strings of potential values parsed from the user-agent string. */
const windowsVersionMap = new Map<string, string | string[]>([
  ["ME", "4.90"],
  ["NT 3.11", "NT3.51"],
  ["NT 4.0", "NT4.0"],
  ["2000", "NT 5.0"],
  ["XP", ["NT 5.1", "NT 5.2"]],
  ["Vista", "NT 6.0"],
  ["7", "NT 6.1"],
  ["8", "NT 6.2"],
  ["8.1", "NT 6.3"],
  ["10", ["NT 6.4", "NT 10.0"]],
  ["RT", "ARM"],
]);

function has(str1: string, str2: string): boolean {
  return lowerize(str2).includes(lowerize(str1));
}

export function mapWinVer(str: string): string | undefined {
  for (const [key, value] of Array.from(windowsVersionMap.entries())) {
    if (Array.isArray(value)) {
      for (const v of value) {
        if (has(v, str)) {
          return key;
        }
      }
    } else if (has(value, str)) {
      return key;
    }
  }
  return str || undefined;
}

export function mapper(
  // deno-lint-ignore no-explicit-any
  target: any,
  ua: string,
  tuples: MatchingTupleProp[],
): void {
  let matches: RegExpExecArray | null = null;
  for (const [matchers, processors] of tuples) {
    let j = 0;
    let k = 0;
    while (j < matchers.length && !matches) {
      matches = matchers[j++]!.exec(ua);

      if (matches) {
        for (const processor of processors) {
          const match = matches[++k];
          if (Array.isArray(processor)) {
            if (processor.length === 2) {
              const [prop, value] = processor;
              if (typeof value === "function") {
                target[prop] = value.call(target, match!);
              } else {
                target[prop] = value;
              }
            } else if (processor.length === 3) {
              const [prop, re, value] = processor;
              target[prop] = match ? match.replace(re, value) : undefined;
            } else {
              const [prop, re, value, fn] = processor;
              target[prop] = match
                ? fn.call(prop, match.replace(re, value))
                : undefined;
            }
          } else {
            target[processor] = match ? match : undefined;
          }
        }
      }
    }
  }
}
