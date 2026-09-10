import fs from "fs";
import path from "path";
import type PDFDocument from "pdfkit";

function fontPath(file: string): Buffer {
    return fs.readFileSync(path.join(process.cwd(), "src/assets/fonts", file));
}

export function registerFonts(doc: typeof PDFDocument.prototype) {
    doc.registerFont("Poppins", fontPath("Poppins-Regular.ttf"));
    doc.registerFont("Poppins-Medium", fontPath("Poppins-Medium.ttf"));
    doc.registerFont("Poppins-Bold", fontPath("Poppins-Bold.ttf"));
    doc.registerFont("Poppins-Black", fontPath("Poppins-Black.ttf"));
    doc.registerFont("Archivo", fontPath("ArchivoBlack-Regular.ttf"));
}