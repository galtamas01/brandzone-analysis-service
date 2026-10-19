import { NextResponse } from "next/server";
import { buildClientReportData } from "@/lib/reportData";
import { buildReportPdf } from "@/lib/pdf/reportPdf";
import { parseReportLocale } from "@/lib/i18n/reportLocale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const locale = parseReportLocale(searchParams.get("lang"));

    if (!clientId || !start || !end) {
        return NextResponse.json(
            { error: "Missing query parameter" },
            { status: 400 }
        );
    }

    try {
        const data = await buildClientReportData(clientId, start, end);
        const pdf = await buildReportPdf(data, locale);

        const safeName = data.clientName.replace(/[^\p{L}\p{N}_-]+/gu, "_");
        const fileName = `${safeName}_${start}_${end}_${locale}.pdf`;

        return new NextResponse(new Uint8Array(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });
    } catch (err) {
        console.error("Report generation error: ", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }

}