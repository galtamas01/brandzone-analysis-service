// src/app/api/reports/preview/route.ts
import { NextResponse } from "next/server";
import { buildClientReportData } from "@/lib/reportData";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");
    const periodStart = searchParams.get("start");
    const periodEnd = searchParams.get("end");

    if (!clientId || !periodStart || !periodEnd) {
        return NextResponse.json(
            { error: "Missing client_id, start or end query parameter" },
            { status: 400 }
        );
    }

    try {
        const data = await buildClientReportData(clientId, periodStart, periodEnd);
        return NextResponse.json(data);
    } catch (err) {
        console.error("Report preview error: ", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}