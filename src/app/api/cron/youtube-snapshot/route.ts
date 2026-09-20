import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { collectYoutubeSnapshot } from "@/lib/youtubeSnapshot";
import { TokenError } from "@/lib/tokens";

type AccountResult = {
    account_id: string;
    ok: boolean;
    error?: string;
    code?: string;
};

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
            { error: "Unauthorized request" },
            { status: 401 }
        );
    }

    const { data: accounts, error: accountsError } = await supabaseAdmin
        .from("account")
        .select("id")
        .eq("platform", "youtube");
    
    if (accountsError) {
        console.error("Failed to list accounts: ", accountsError);
        return NextResponse.json(
            { error: "Failed to list accounts" },
            { status: 500 }
        );
    }

    const results: AccountResult[] = [];

    for (const account of accounts ?? []) {
        try {
            await collectYoutubeSnapshot(account.id);
            results.push({ account_id: account.id, ok: true });
        } catch (err) {
            if (err instanceof TokenError) {
                results.push({ account_id: account.id, ok: false, error: err.message, code: err.code });
            } else {
                results.push({
                    account_id: account.id,
                    ok: false,
                    error: err instanceof Error ? err.message : "Unknown error",
                });
            }
        }
    }

    const succeeded = results.filter((r) => r.ok).length;

    return NextResponse.json({
        message: "YouTube snapshot CRON finished",
        total: results.length,
        succeeded,
        failed: results.length - succeeded,
        results,
    });
}