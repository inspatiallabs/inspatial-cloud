/* https://developer.apple.com/fonts/TrueType-Reference-Manual/ */

const tableMap = new Map<string, {
  offset: number;
  length: number;
  checkSum?: number;
}>();

export async function loadFont(filePath: string) {
  const { view, data } = await loadFontData(filePath);
  tableMap.clear();
  loadTables(view);
  const names = parseNameTable(view);
  const header = parseHeadTable(view);
  const scale = 1000 / header.unitsPerEm;
  let flags = 0;
  if (header.italic) {
    // 00001000
    flags |= 1 << 6;
  }
  const os2 = parseOS2Table(view);

  const post = loadPostScriptTable(view);
  // convert bounding box to 1000 units
  const fontBBox: [number, number, number, number] = [
    header.bbox.xMin * scale,
    header.bbox.yMin * scale,
    header.bbox.xMax * scale,
    header.bbox.yMax * scale,
  ];

  const horizontalHeader = parseHorizontalHeaderTable(view);

  const fontDict = {
    baseFont: names.postScriptName || names.fontFamily || "Unknown",
    firstChar: 32,
    lastChar: 127,
    widths: [] as number[],
    encoding: "/WinAnsiEncoding",
  };
  const fontDesc = {
    fontName: fontDict.baseFont,
    fontFamily: names.fontFamily,
    fontWeight: os2.usWeightClass,
    stemV: Math.round(os2.usWeightClass / 20),
    flags,
    ascent: horizontalHeader.ascent * scale,
    descent: horizontalHeader.descent * scale,
    leading: horizontalHeader.lineGap * scale,
    fontBBox,
    maxWidth: horizontalHeader.advanceWidthMax * scale,
    capHeight: 0,
    italicAngle: post.italicAngle,
    xHeight: 0,
  };

  if (os2.sxHeight) {
    fontDesc.xHeight = os2.sxHeight * scale;
  }
  if (os2.sCapHeight) {
    fontDesc.capHeight = os2.sCapHeight * scale;
  }
  if (os2.usWeightClass) {
    fontDesc.fontWeight = os2.usWeightClass;
  }
  const finalWidths: number[] = [];
  const widths = loadGlyphWidths(
    view,
  );

  const charToGlyph = parseCmapTable(view);
  const widthsMap: Map<number, number> = new Map();
  for (
    let charCode = fontDict.firstChar;
    charCode <= fontDict.lastChar;
    charCode++
  ) {
    const glyphIndex = charToGlyph.get(charCode) || 0;
    let width = 0;
    if (glyphIndex < widths.length) {
      width = widths[glyphIndex];
    } else if (widths.length > 0) {
      width = widths[widths.length - 1];
    }
    const scaledWidth = width * scale;
    widthsMap.set(charCode, scaledWidth);
    finalWidths.push(scaledWidth);
  }
  fontDict.widths = finalWidths;

  return {
    fontName: fontDict.baseFont,
    fontDict,
    widthsMap,
    fontDesc,
    header,
    data,
  };
}

function loadTables(view: DataView) {
  // Read the number of tables
  const numTables = view.getUint16(4);
  // Read the table names and offsets
  for (let i = 0; i < numTables; i++) {
    const offset = 12 + i * 16;
    const tag = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
    const checkSum = view.getUint32(offset + 4);
    const tableOffset = view.getUint32(offset + 8);
    const length = view.getUint32(offset + 12);
    tableMap.set(tag, { offset: tableOffset, length, checkSum });
  }
}

function parseHeadTable(view: DataView) {
  const head = tableMap.get("head");
  if (!head) {
    throw new Error("No head table found");
  }
  const offset = head.offset;
  const header = {
    version: view.getUint32(offset),
    fontRevision: view.getUint32(offset + 4),
    checkSumAdjustment: view.getUint32(offset + 8),
    magicNumber: view.getUint32(offset + 12),
    flags: view.getUint16(offset + 16),
    unitsPerEm: view.getUint16(offset + 18),
    created: view.getBigUint64(offset + 20),
    modified: view.getBigUint64(offset + 28),
    xMin: view.getInt16(offset + 36),
    yMin: view.getInt16(offset + 38),
    xMax: view.getInt16(offset + 40),
    yMax: view.getInt16(offset + 42),
    macStyle: {
      bold: (view.getUint16(offset + 44) & 0x1) !== 0,
      italic: (view.getUint16(offset + 44) & 0x2) !== 0,
      underline: (view.getUint16(offset + 44) & 0x4) !== 0,
      outline: (view.getUint16(offset + 44) & 0x8) !== 0,
      shadow: (view.getUint16(offset + 44) & 0x10) !== 0,
      condensed: (view.getUint16(offset + 44) & 0x20) !== 0,
      extended: (view.getUint16(offset + 44) & 0x40) !== 0,
    },
    lowestRecPPEM: view.getUint16(offset + 46),
    fontDirectionHint: view.getInt16(offset + 48),
    indexToLocFormat: view.getInt16(offset + 50),
    glyphDataFormat: view.getInt16(offset + 52),
  } as const;

  return {
    unitsPerEm: header.unitsPerEm,
    bbox: {
      xMin: header.xMin,
      yMin: header.yMin,
      xMax: header.xMax,
      yMax: header.yMax,
    },
    ...header.macStyle,
  };
}
/** the 'hhea' table
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6hhea.html
 * The 'hhea' table contains information for horizontal layout.
 */
function parseHorizontalHeaderTable(view: DataView) {
  const hhea = tableMap.get("hhea");
  if (!hhea) {
    throw new Error("No hhea table found");
  }
  const offset = hhea.offset;
  const header = {
    ascent: view.getInt16(offset + 4),
    descent: view.getInt16(offset + 6),
    lineGap: view.getInt16(offset + 8),
    advanceWidthMax: view.getUint16(offset + 10),
    minLeftSideBearing: view.getInt16(offset + 12),
    minRightSideBearing: view.getInt16(offset + 14),
    xMaxExtent: view.getInt16(offset + 16),
    caretSlopeRise: view.getInt16(offset + 18),
    caretSlopeRun: view.getInt16(offset + 20),
    caretOffset: view.getInt16(offset + 22),
    metricDataFormat: view.getInt16(offset + 32),
    numberOfHMetrics: view.getUint16(offset + 34),
  } as const;
  return header;
}

function parseOS2Table(view: DataView) {
  const os2 = tableMap.get("OS/2");
  if (!os2) {
    throw new Error("No OS/2 table found");
  }
  const offset = os2.offset;
  const version = view.getUint16(offset);
  if (version < 0 || version > 5) {
    throw new Error(`Unsupported OS/2 table version: ${version}`);
  }
  const info = {
    xAvgCharWidth: view.getInt16(offset + 2),
    usWeightClass: view.getUint16(offset + 4),
    usWidthClass: view.getUint16(offset + 6),
    fsType: view.getUint16(offset + 8),
    fsSelection: view.getUint16(offset + 62),
    usFirstCharIndex: view.getUint16(offset + 64),
    usLastCharIndex: view.getUint16(offset + 66),
    sTypoLineGap: view.getInt16(offset + 72),
    sxHeight: version >= 2 ? view.getInt16(offset + 86) : 0,
    sCapHeight: version >= 2 ? view.getInt16(offset + 88) : 0,
  };
  return info;
}

function loadGlyphWidths(
  view: DataView,
) {
  const widths: number[] = [];
  // look up the glyph index for each character code

  const hmtx = tableMap.get("hmtx");
  const hhea = tableMap.get("hhea");
  if (!hmtx) {
    throw new Error("No hmtx table found");
  }
  if (!hhea) {
    throw new Error("No hhea table found");
  }
  const numberOfHMetrics = view.getUint16(hhea.offset + 34);
  const hmtxOffset = hmtx.offset;
  for (let i = 0; i < numberOfHMetrics; i++) {
    let width = 0;
    if (i < numberOfHMetrics) {
      width = view.getUint16(hmtxOffset + i * 4);
    } else {
      width = view.getUint16(hmtxOffset + (numberOfHMetrics - 1) * 4);
    }
    widths.push(width);
  }
  return widths;
}

function parseCmapTable(view: DataView) {
  const cmap = tableMap.get("cmap");
  if (!cmap) {
    throw new Error("No cmap table found");
  }
  const offset = cmap.offset;
  const _version = view.getUint16(offset);
  const numTables = view.getUint16(offset + 2);

  for (let i = 0; i < numTables; i++) {
    const platformID = view.getUint16(offset + 4 + i * 8);
    const encodingID = view.getUint16(offset + 6 + i * 8);
    const subtableOffset = view.getUint32(offset + 8 + i * 8);
    // debug(
    //   `Subtable ${i} - Platform ID: ${platformID}, Encoding ID: ${encodingID}, Offset: ${subtableOffset}`,
    // );
    // For simplicity, we only handle platform ID 3 (Windows) and encoding ID 1 (Unicode BMP)
    if (platformID !== 3) continue;
    if (encodingID !== 1) continue;
    const subtableStart = offset + subtableOffset;
    const format = view.getUint16(subtableStart);
    if (format !== 4) continue;
    // Format 4 is the most common
    const _length = view.getUint16(subtableStart + 2);
    const _language = view.getUint16(subtableStart + 4);
    const segCountX2 = view.getUint16(subtableStart + 6);
    const segCount = segCountX2 / 2;
    const endCodes: number[] = [];
    const startCodes: number[] = [];
    const idDeltas: number[] = [];
    const idRangeOffsets: number[] = [];
    let offsetPtr = subtableStart + 14;
    for (let j = 0; j < segCount; j++) {
      endCodes.push(view.getUint16(offsetPtr));
      offsetPtr += 2;
    }
    offsetPtr += 2; // skip reservedPad
    for (let j = 0; j < segCount; j++) {
      startCodes.push(view.getUint16(offsetPtr));
      offsetPtr += 2;
    }
    for (let j = 0; j < segCount; j++) {
      idDeltas.push(view.getInt16(offsetPtr));
      offsetPtr += 2;
    }
    for (let j = 0; j < segCount; j++) {
      idRangeOffsets.push(view.getUint16(offsetPtr));
      offsetPtr += 2;
    }
    const glyphIdArrayOffset = offsetPtr;
    // Now we can build the character to glyph index mapping
    const charToGlyph: Map<number, number> = new Map();
    for (let j = 0; j < segCount; j++) {
      const start = startCodes[j];
      const end = endCodes[j];
      const delta = idDeltas[j];
      const rangeOffset = idRangeOffsets[j];
      for (let c = start; c <= end; c++) {
        let glyphIndex = 0;
        if (rangeOffset === 0) {
          glyphIndex = (c + delta) & 0xffff;
        } else {
          const roffset = rangeOffset / 2 +
            (c - start) -
            (segCount - j);
          const glyphIdAddress = glyphIdArrayOffset + roffset * 2;
          if (glyphIdAddress < view.byteLength) {
            glyphIndex = view.getUint16(glyphIdAddress);
            if (glyphIndex !== 0) {
              glyphIndex = (glyphIndex + delta) & 0xffff;
            }
          }
        }
        charToGlyph.set(c, glyphIndex);
      }
    }
    return charToGlyph;
  }
  throw new Error("No suitable cmap subtable found");
}

/** the 'name' table */
function parseNameTable(view: DataView) {
  const name = tableMap.get("name");
  if (!name) {
    throw new Error("No name table found");
  }
  const nameCount = view.getUint16(name.offset + 2);
  const stringOffset = view.getUint16(name.offset + 4);

  const nameMap = new Map<number, string>();
  for (let i = 0; i < nameCount; i++) {
    const recordOffset = name.offset + 6 + i * 12;
    const platformID = view.getUint16(recordOffset);
    const encodingID = view.getUint16(recordOffset + 2);
    const nameID = view.getUint16(recordOffset + 6);
    const length = view.getUint16(recordOffset + 8);
    const offsetInStorage = view.getUint16(recordOffset + 10);
    const stringStart = name.offset + stringOffset + offsetInStorage;
    const subArray = new Uint8Array(view.buffer, stringStart, length);
    if (platformID !== 3 || encodingID !== 1) {
      // we only support Windows Unicode BMP for now
      nameMap.set(nameID, "");
      continue;
    }
    const decoder = new TextDecoder("utf-16be");
    const nameString = decoder.decode(subArray);
    nameMap.set(nameID, nameString);
  }
  const nameInfo = {
    fontFamily: nameMap.get(1) || "",
    fontSubfamily: nameMap.get(2) || "",
    uniqueFontID: nameMap.get(3) || "",
    fullFontName: nameMap.get(4) || "",
    postScriptName: nameMap.get(6) || "",
  } as const;
  return nameInfo;
}
async function loadFontData(
  filePath: string,
): Promise<{ view: DataView; data: Uint8Array }> {
  const data = await Deno.readFile(filePath);
  const view = new DataView(data.buffer);
  // validate the font by checking the sfnt version
  const sfntVersion = view.getUint32(0);
  switch (sfntVersion) {
    case 0x00010000: // TrueType
    case 0x74727565: // 'true'
      break;
    case 0x74797031: // 'typ1'
      throw new Error(
        "Unsupported font format: Type 1 font in TrueType wrapper",
      );
    default:
      throw new Error("Unsupported font format");
  }
  return {
    view,
    data,
  };
}

function loadPostScriptTable(view: DataView) {
  const post = tableMap.get("post");
  if (!post) {
    throw new Error("No post table found");
  }
  const offset = post.offset;
  const format = view.getUint32(offset);
  if (format !== 0x00020000) {
    throw new Error(`Unsupported post table format: ${format}`);
  }
  const italicAngle = view.getInt32(offset + 4) / 65536;
  const underlinePosition = view.getInt16(offset + 8);
  const underlineThickness = view.getInt16(offset + 10);
  const isFixedPitch = view.getUint32(offset + 12) !== 0;
  const minMemType42 = view.getUint32(offset + 16);
  const maxMemType42 = view.getUint32(offset + 20);
  const minMemType1 = view.getUint32(offset + 24);
  const maxMemType1 = view.getUint32(offset + 28);
  return {
    format,
    italicAngle,
    underlinePosition,
    underlineThickness,
    isFixedPitch,
    minMemType42,
    maxMemType42,
    minMemType1,
    maxMemType1,
  };
}
