import { NextResponse } from "next/server";
import { collectYoutubeSnapshot } from "@/lib/youtubeSnapshot";
import { TokenError } from "@/lib/tokens";

function toDateString(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("account_id");

    if (!accountId) {
        return NextResponse.json(
            { error: "Missing account_id query parameter" },
            { status: 400 }
        );
    }

    try {
        const result = await collectYoutubeSnapshot(accountId);
        return NextResponse.json(
            { message: "Snapshot stored successfully", ...result }
        );
    } catch (err) {
        if (err instanceof TokenError) {
            return NextResponse.json(
                { error: err.message, code: err.code},
                { status: err.status }
            );
        }
        console.error("Server error: ", err);
        return NextResponse.json(
            { error: "Server error occured" },
            { status: 500 }
        );
    }
}