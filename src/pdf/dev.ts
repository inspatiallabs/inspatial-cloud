import { PDFFactory } from "./mod.ts";

const pdf = new PDFFactory("2.0", {
  pageSize: "A4",
  orientation: "portrait",
});

const page = pdf.addPage();

const stream = page.addContentStream();
stream.addText("helllo man").fontSize(50).position(50, 1000);

stream.addText("a second text").fontSize(50).position(50, 800);
pdf.generate("sample.pdf");
