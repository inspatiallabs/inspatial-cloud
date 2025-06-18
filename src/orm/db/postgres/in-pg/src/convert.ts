export function stringToUTF8Array(
  str: string,
  heap: any,
  outIdx: number,
  maxBytesToWrite: number,
) {
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = (65536 + ((u & 1023) << 10)) | (u1 & 1023);
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 192 | (u >> 6);
      heap[outIdx++] = 128 | (u & 63);
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 224 | (u >> 12);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      heap[outIdx++] = 240 | (u >> 18);
      heap[outIdx++] = 128 | ((u >> 12) & 63);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    }
  }
  heap[outIdx] = 0;
  return outIdx - startIdx;
}
export function uleb128Encode(n: number, target: number[] = []) {
  if (n < 128) {
    target.push(n);
  } else {
    target.push(n % 128 | 128, n >> 7);
  }
}
export function intArrayFromString(
  stringy: string,
  dontAddNull: boolean,
  length: number = 0,
) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
const UTF8Decoder = new TextDecoder();
export function UTF8ArrayToString(
  heapOrArray: any,
  idx = 0,
  maxBytesToRead = NaN,
) {
  let endIdx = idx + maxBytesToRead;
  let endPtr = idx;
  while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
    return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
  }
  let str = "";
  while (idx < endPtr) {
    var u0 = heapOrArray[idx++];
    if (!(u0 & 128)) {
      str += String.fromCharCode(u0);
      continue;
    }
    var u1 = heapOrArray[idx++] & 63;
    if ((u0 & 224) == 192) {
      str += String.fromCharCode(((u0 & 31) << 6) | u1);
      continue;
    }
    var u2 = heapOrArray[idx++] & 63;
    if ((u0 & 240) == 224) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) |
        (heapOrArray[idx++] & 63);
    }
    if (u0 < 65536) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 65536;
      str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
    }
  }
  return str;
}

export function sigToWasmTypes(sig: string) {
  var typeNames: Record<string, string> = {
    i: "i32",
    j: "i64",
    f: "f32",
    d: "f64",
    e: "externref",
    p: "i32",
  };
  var type = {
    parameters: [] as string[],
    results: sig[0] == "v" ? [] : [typeNames[sig[0]]],
  };
  for (var i = 1; i < sig.length; ++i) {
    type.parameters.push(typeNames[sig[i]]);
  }
  return type;
}

export function lengthBytesUTF8(str: string) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    var c = str.charCodeAt(i);
    if (c <= 127) {
      len++;
    } else if (c <= 2047) {
      len += 2;
    } else if (c >= 55296 && c <= 57343) {
      len += 4;
      ++i;
    } else {
      len += 3;
    }
  }
  return len;
}

const INT53_MAX = 9007199254740992n;
const INT53_MIN = -9007199254740992n;
export function bigintToI53Checked(num: bigint | number) {
  return num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
}

export function jstoi_q(str: string) {
  return parseInt(str);
}

export function normalizeVirtualPath(path: string) {
  return path.replaceAll("\\", "/").replace(/[a-zA-Z]:/g, "/").replaceAll(
    /\/+/g,
    "/",
  );
}
