import { PDFFactory } from "./src/pdf.ts";

const pdf = new PDFFactory("2.0", {
  pageSize: "A4",
  orientation: "portrait",
});

// await pdf.resources.addFont("./eucelid.font");
await pdf.resources.addFont(
  "/home/eliveffer/Documents/inspatial/beam/mwc/mwc-ws/inspatial-cloud/src/pdf/eucelid/Euclid_Circular_B-Regular.ttf",
);
await pdf.resources.addFont(
  "/home/eliveffer/Documents/inspatial/beam/mwc/mwc-ws/inspatial-cloud/src/pdf/eucelid/Euclid_Circular_B-Medium.ttf",
);
const page = pdf.addPage();
const stream = page.addContentStream();
stream.addText("yo its working").fontSize(50).position(50, 1000).fontFamily(
  "EuclidCircularB",
);
stream.addText("it's bold").fontFamily("EuclidCircularB").fontWeight("bold")
  .position(50, 800).fontSize(50);
stream.addText("my wedding clubs").fontSize(50).position(50, 900);
pdf.generate("sample.pdf");

// const byteData = Deno.readFileSync("demo.bin");

// const data = byteData.slice(byteData.byteLength - 11, byteData.byteLength);

// const fontData = byteData.slice(7, byteData.byteLength - 11);
