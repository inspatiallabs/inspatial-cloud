import { PDFFactory } from "./mod.ts";
import { fontData } from "./src/resources/fonts/font.ts";
import { PDFObject, TTFFont } from "./src/resources/fonts/ttfFont.js";
// const pdf = new PDFFactory("2.0", {
//   pageSize: "A4",
//   orientation: "portrait",
// });

// await pdf.resources.addFont("./eucelid/Euclid_Circular_B-Regular.ttf");
// console.log(pdf.resources.fontRegistry.families);
// const page = pdf.addPage();
// const stream = page.addContentStream();
// stream.addText("my wedding club").fontSize(50).position(50, 1000).fontFamily(
//   "EuclidCircularB",
// );

// stream.addText("my wedding club").fontSize(50).position(50, 900);
// pdf.generate("sample.pdf");
const binaryStringToUint8Array = (binString: string) => {
  const len = binString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
};
const hexData = binaryStringToUint8Array(atob(fontData));
const font = TTFFont.open(hexData);


const obj = PDFObject();
