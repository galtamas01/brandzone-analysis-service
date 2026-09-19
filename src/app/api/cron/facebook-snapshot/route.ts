import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { collectFacebookSnapshot } from "@/lib/metaSnapshot";
import { TokenError } from "@/lib/youtubeAuth";

type AccountResult = {
    account_id: string;
    ok: boolean;
    error?: string;
    code?: string;
}

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: accounts, error: accountsError } = await supabaseAdmin
        .from("account")
        .select("id")
        .eq("platform", "facebook");
    
    if (accountsError) {
        console.error("Failed to list accounts: ", accountsError);
        return NextResponse.json({ error: "Failed to list accounts" }, { status: 500 });
    }

    const results: AccountResult[] = [];

    for (const account of accounts ?? []) {
        try {
            await collectFacebookSnapshot(account.id);
            results.push({ account_id: account.id, ok: true });
        } catch (err) {
            if (err instanceof TokenError) {
                results.push({ account_id: account.id, ok: false, error: err.message, code: err.code });
            } else {
                results.push({ account_id: account.id, ok: false, error: err instanceof Error ? err.message : "Unknown error" });
            }
        }
    }

    const succeeded = results.filter((r) => r.ok).length;

    return NextResponse.json({
        message: "Facebook snapshot cron finished",
        total: results.length,
        succeeded,
        failed: results.length - succeeded,
        results,
    });
}