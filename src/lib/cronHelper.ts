import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";
import { TokenError } from "./tokens";

type CollectFn = (accountId: string) => Promise<unknown>;

export async function runSnapshotCron(request: Request, platform: string, collect: CollectFn) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: accounts, error: accountsError } = await supabaseAdmin
        .from("account")
        .select("id")
        .eq("platform", platform);

    if (accountsError) {
        console.error("Failed to list accounts: ", accountsError);
        return NextResponse.json({ error: "Failed to list accounts" }, { status: 500 });
    }

    const results: { account_id: string; ok: boolean; error?: string; code?: string }[] = [];

    for (const account of accounts ?? []) {
        try {
            await collect(account.id);
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
        message: `${platform} snapshot cron finished`,
        total: results.length,
        succeeded,
        failed: results.length - succeeded,
        results,
    });
}