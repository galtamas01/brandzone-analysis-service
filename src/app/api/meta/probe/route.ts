// src/app/api/meta/probe/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GRAPH = "https://graph.facebook.com/v21.0";

function dateRange() {
    const until = Math.floor(Date.now() / 1000);
    const since = Math.floor((Date.now() - 28 * 24 * 60 * 60 * 1000) / 1000);
    return { since, until };
}

async function probe(label: string, url: string, token: string) {
    try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        // sikeres, ha nincs error mező; hibánál az error objektumot adjuk vissza
        return { label, ok: res.ok && !data.error, result: data.error ?? data };
    } catch (e) {
        return { label, ok: false, result: String(e) };
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("account_id");
    if (!accountId) return NextResponse.json({ error: "Missing account_id" }, { status: 400 });

    const { data: account } = await supabaseAdmin
        .from("account")
        .select("platform, platform_account_id")
        .eq("id", accountId)
        .maybeSingle();
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const { data: tokenRow } = await supabaseAdmin
        .from("oauth_token")
        .select("access_token")
        .eq("account_id", accountId)
        .maybeSingle();
    if (!tokenRow) return NextResponse.json({ error: "No token for account" }, { status: 404 });

    const token = decrypt(tokenRow.access_token);
    const id = account.platform_account_id;
    const { since, until } = dateRange();
    const probes = [];

    if (account.platform === "facebook") {
        // Követő: melyik mező él?
        probes.push(await probe("field:fan_count", `${GRAPH}/${id}?fields=name,fan_count`, token));
        probes.push(await probe("field:followers_count", `${GRAPH}/${id}?fields=followers_count`, token));
        // Megtekintés/elérés insight: melyik metrikanév él?
        for (const m of ["page_impressions", "page_media_view", "views", "page_views_total"]) {
            probes.push(await probe(`insight:${m}`,
                `${GRAPH}/${id}/insights?metric=${m}&period=day&since=${since}&until=${until}`, token));
        }
        // Lájk: poszt-szintű összegzés alakja
        probes.push(await probe("posts:likes.summary",
            `${GRAPH}/${id}/posts?fields=id,likes.summary(true)&limit=5`, token));
    } else if (account.platform === "instagram") {
        probes.push(await probe("field:followers_count",
            `${GRAPH}/${id}?fields=username,followers_count,media_count`, token));
        for (const m of ["reach", "impressions", "views", "profile_views"]) {
            probes.push(await probe(`insight:${m}`,
                `${GRAPH}/${id}/insights?metric=${m}&period=day&since=${since}&until=${until}`, token));
        }
        probes.push(await probe("media:like_count",
            `${GRAPH}/${id}/media?fields=id,like_count&limit=5`, token));
    } else {
        return NextResponse.json({ error: `Unsupported platform: ${account.platform}` }, { status: 400 });
    }

    return NextResponse.json({ platform: account.platform, platform_account_id: id, probes });
}