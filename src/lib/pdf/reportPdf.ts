import PDFDocument from "pdfkit";
import { registerFonts } from "./fonts";
import type { ClientReportData, PlatformReportData } from "../reportData";
import { type ReportLocale, type ReportStrings, getReportStrings, DEFAULT_REPORT_LOCALE } from "../i18n/reportLocale";


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

function fmt(n: number, L: ReportStrings): string {
    return n.toLocaleString(L.numberLocale);
}

function shortDate(fullDate: string) {
    return fullDate.slice(5);
}

type ChartOpts = {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    title: string;
    points: { date: string; value: number }[];
    L: ReportStrings;
};

const GRID_COLOR = "#1E1E24";
function drawLineChart(doc: typeof PDFDocument.prototype, o: ChartOpts) {
    const { x, y, width, height, color, title, points, L } = o;

    doc.font("Poppins-Medium").fontSize(10).fillColor(COLOR.textMuted).text(title, x, y);

    const top = y + 18;
    const chartH = height - 18;
    const bottom = top + chartH;

    if (points.length === 0) {
        doc.font("Poppins").fontSize(8).fillColor(COLOR.textMuted).text(L.noChartData, x, top);
        return;
    }

    const values = points.map((p) => p.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
        min = min === 0 ? 0 : min * 0.95;
        max = max === 0 ? 1 : max * 1.05;
    } else {
        const pad = (max - min) * 0.05;
        min -= pad;
        max += pad;
    }

    const sx = (i: number) =>
        points.length === 1 ? x + width / 2 : x + (i / (points.length - 1)) * width;
    const sy = (v: number) => bottom - ((v - min) / (max - min)) * chartH;

    // 1) Tengelykeret
    doc.save();
    doc.lineWidth(0.5).strokeColor(COLOR.border);
    doc.moveTo(x, bottom).lineTo(x + width, bottom).stroke(); // x-tengely
    doc.moveTo(x, top).lineTo(x, bottom).stroke();             // y-tengely
    doc.restore();

    // 2) Rács — VÍZSZINTES + FÜGGŐLEGES segédvonalak, még a görbe ELŐTT,
    //    hogy a görbe (és a kitöltés) utólag ráfessen, és a metszéspontokban eltakarja őket.
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    doc.save();
    doc.lineWidth(0.5).strokeColor(GRID_COLOR);

    ticks.forEach((t) => {
        if (t === 0) return; // az alsó/bal szélen már ott a tengelykeret, felesleges duplázni
        const yPos = bottom - t * chartH;
        doc.moveTo(x, yPos).lineTo(x + width, yPos).stroke(); // vízszintes
        const xPos = x + t * width;
        doc.moveTo(xPos, top).lineTo(xPos, bottom).stroke();  // függőleges
    });
    doc.restore();

    // 3) Kitöltés a görbe alatt — erre már ráfest a rácsra
    doc.save();
    doc.moveTo(sx(0), bottom);
    points.forEach((p, i) => doc.lineTo(sx(i), sy(p.value)));
    doc.lineTo(sx(points.length - 1), bottom);
    doc.closePath();
    doc.fillOpacity(0.12).fill(color);
    doc.restore();

    // 4) Maga a görbe — ez fest rá utoljára, ez takarja el a rácsot a metszéspontokban
    doc.save();
    doc.lineWidth(1.5).strokeColor(color);
    points.forEach((p, i) => {
        const px = sx(i);
        const py = sy(p.value);
        if (i === 0) doc.moveTo(px, py);
        else doc.lineTo(px, py);
    });
    doc.stroke();
    doc.restore();

    // 5) y-tengely értékfeliratok (0/25/50/75/100%-nál) — a rajzterületen kívül, sorrend-független
    doc.font("Poppins").fontSize(7).fillColor(COLOR.textMuted);
    ticks.forEach((t) => {
        const yPos = bottom - t * chartH;
        const value = min + t * (max - min);
        doc.text(fmt(Math.round(value), L), x - 40, yPos - 3, { width: 36, align: "right" });
    });

    // 6) x-tengely dátumfeliratok (0/25/50/75/100%-nál) — a rajzterület alatt, sorrend-független
    doc.font("Poppins").fontSize(7).fillColor(COLOR.textMuted);
    ticks.forEach((t, idx) => {
        const i = Math.round(t * (points.length - 1));
        const label = shortDate(points[i].date);
        const px = sx(i);

        if (idx === 0) {
            doc.text(label, px, bottom + 4, { width: 40 });
        } else if (idx === ticks.length - 1) {
            doc.text(label, px - 40, bottom + 4, { width: 40, align: "right" });
        } else {
            doc.text(label, px - 20, bottom + 4, { width: 40, align: "center" });
        }
    });
}

function drawPlatformPage(doc: typeof PDFDocument.prototype, client: string, period: string, p: PlatformReportData, L: ReportStrings) {
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
        { label: L.cardViews, value: p.endViews, delta: p.deltaViews, color: COLOR.views },
        { label: L.cardLikes, value: p.endLikes, delta: p.deltaLikes, color: COLOR.likes },
        { label: L.cardFollowers, value: p.endFollowers, delta: p.deltaFollowers, color: COLOR.followers },
    ];

    cards.forEach((c, i) => {
        const cx = x + i * (cardW + cardGap);
        doc.roundedRect(cx, y, cardW, 78, 10).fillAndStroke(COLOR.panel, COLOR.border);
        doc.font("Poppins").fontSize(9).fillColor(COLOR.textMuted).text(c.label, cx + 12, y + 12, { width: cardW - 24 });
        doc.font("Poppins-Black").fontSize(20).fillColor(c.color).text(fmt(c.value, L), cx + 12, y + 28, { width: cardW - 24 });
        const sign = c.delta >= 0 ? "+" : "";
        doc.font("Poppins-Medium").fontSize(9).fillColor(COLOR.textMuted)
            .text(`${sign}${fmt(c.delta, L)} ${L.deltaSuffix}`, cx + 12, y + 56, { width: cardW - 24 });
    });
    y += 78 + 24;

    //diagramok
    const chartX = x + 44;
    const chartW = PAGE.width - PAGE.margin - chartX;
    const chartH = 150;
    const chartGap = 28;

    const charts = [
        { title: L.chartViews, color: COLOR.views, key: "views" as const},
        { title: L.chartLikes, color: COLOR.likes, key: "likes" as const},
        { title : L.chartFollowers, color: COLOR.followers, key: "followers" as const}
    ];

    charts.forEach((c, i) => {
        drawLineChart(doc, {
            x: chartX,
            y: y + i * (chartH + chartGap),
            width: chartW,
            height: chartH,
            color: c.color,
            title: c.title,
            points: p.series.map((pt) => ({ date: pt.date, value: pt[c.key] })),
            L,
        });
    });
    
    //adatokkal kapcsolatos megjegyzes
    if (p.dataCoverageCode) {
        const note = p.dataCoverageCode === "no_data" ? L.coverageNoData : L.coveragePartialBaseline;
        doc.font("Poppins").fontSize(8).fillColor(COLOR.textMuted)
            .text(note, x, PAGE.height - PAGE.margin - 20, { width: PAGE.width - 2 * PAGE.margin });
    }

}

export function buildReportPdf(data: ClientReportData, locale: ReportLocale = DEFAULT_REPORT_LOCALE): Promise<Buffer> {
    const L = getReportStrings(locale);

    const doc = new PDFDocument({ size: "A4", margin: PAGE.margin, autoFirstPage: false });
    registerFonts(doc);

    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
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
            drawPlatformPage(doc, data.clientName, period, p, L);
        }
    }

    doc.end();
    return done;
}
