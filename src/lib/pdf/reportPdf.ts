import PDFDocument from "pdfkit";
import { registerFonts } from "./fonts";
import type { ClientReportData, PlatformReportData } from "../reportData";

const COLOR = {
    bg: "#0A0A0B",
    panel: "#16161A",
    border: "#2A2A31",
    textPrimary: "#F5F5F7",
    textMuted: "#A1A1AA",
    views: "#4F9DFF",
    likes: "#FF5C8A",
    followers: "#22C55E",
};

const PAGE = { width: 595.28, height: 841.89, margin: 48 };

function fmt(n: number): string {
    return n.toLocaleString("hu-HU");
}

function drawPlatformPage(doc: typeof PDFDocument.prototype, client: string, period: string, p: PlatformReportData) {
    doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLOR.bg);

    const x = PAGE.margin;
    let y = PAGE.margin;

    //kliens neve
    doc.font("Archivo").fontSize(26).fillColor(COLOR.textPrimary).text(client, x, y);
    y += 36;

    //platform + idoszak
    doc.font("Poppins").fontSize(11).fillColor(COLOR.textMuted).text(`${p.platform.toUpperCase()}   ·   ${period}`, x, y);
    y += 14;
    doc.text(p.accountNames.join(", "), x, y);
    y += 30;

    //ertek-kartyak egymas mellett
    const cardGap = 12;
    const cardW = (PAGE.width - 2 * PAGE.margin - 2 * cardGap) / 3;
    const cards = [
        { label: "All views", value: p.endViews, delta: p.deltaViews, color: COLOR.views },
        { label: "All likes", value: p.endLikes, delta: p.deltaLikes, color: COLOR.likes },
        { label: "All followers", value: p.endFollowers, delta: p.deltaFollowers, color: COLOR.followers },
    ];

    cards.forEach((c, i) => {
        const cx = x + i * (cardW + cardGap);
        doc.roundedRect(cx, y, cardW, 78, 10).fillAndStroke(COLOR.panel, COLOR.border);
        doc.font("Poppins").fontSize(9).fillColor(COLOR.textMuted).text(c.label, cx + 12, y + 12, { width: cardW - 24 });
        doc.font("Poppins-Black").fontSize(20).fillColor(c.color).text(fmt(c.value), cx + 12, y + 28, { width: cardW - 24 });
        const sign = c.delta >= 0 ? "+" : "";
        doc.font("Poppins-Medium").fontSize(9).fillColor(COLOR.textMuted)
            .text(`${sign}${fmt(c.delta)} in period`, cx + 12, y + 56, { width: cardW - 24 });
    });
    y += 78 + 24;

    //diagramok
    doc.font("Poppins").fontSize(10).fillColor(COLOR.textMuted)
        .text("[ diagram placeholder ]", x, y);
    
    //adatokkal kapcsolatos megjegyzes
    if (p.dataCoverageNote) {
        doc.font("Poppins").fontSize(8).fillColor(COLOR.textMuted)
            .text(p.dataCoverageNote, x, PAGE.height - PAGE.margin - 20, { width: PAGE.width - 2 * PAGE.margin });
    }

}

export function buildReportPdf(data: ClientReportData): Promise<Buffer> {
    const doc = new PDFDocument({ size: "A4", margin: PAGE.margin, autoFirstPage: false });
    registerFonts(doc);

    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
    });

    const period = `${data.periodStart} - ${data.periodEnd}`;

    if (data.platforms.length === 0) {
        doc.addPage();
        doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLOR.bg);
        doc.font("Poppins").fontSize(14).fillColor(COLOR.textPrimary)
            .text("No account connected to this client.", PAGE.margin, PAGE.margin);
    } else {
        for (const p of data.platforms) {
            doc.addPage();
            drawPlatformPage(doc, data.clientName, period, p);
        }
    }

    doc.end();
    return done;
}
