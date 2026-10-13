import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";
import { TokenError } from "./tokens";

type CollectFn = (accountId: string) => Promise<unknown>;

// A Vercel Cron a CRON_SECRET értékét `Authorization: Bearer <titok>` fejlécben küldi.
// Ha a titok nincs beállítva, a kérést elutasítjuk (korábban a "Bearer undefined" fejléc átment volna),
// az összehasonlítás pedig állandó idejű, hogy az időmérésből ne lehessen a titokra következtetni.
function isAuthorizedCronRequest(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        console.error("CRON_SECRET is not set, cron request rejected");
        return false;
    }

    const received = request.headers.get("authorization") ?? "";
    const expected = `Bearer ${secret}`;

    // SHA-256-tal azonos hosszúra hozzuk a két értéket, így a timingSafeEqual nem dob hibát,
    // és a fejléc hossza sem szivárog.
    const receivedHash = crypto.createHash("sha256").update(received).digest();
    const expectedHash = crypto.createHash("sha256").update(expected).digest();
    return crypto.timingSafeEqual(receivedHash, expectedHash);
}

export async function runSnapshotCron(request: Request, platform: string, collect: CollectFn) {
    if (!isAuthorizedCronRequest(request)) {
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