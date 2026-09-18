import { supabaseAdmin } from "./supabaseAdmin";
import { getMetaPageToken } from "./metaAuth";
import { TokenError } from "./youtubeAuth";

const GRAPH = "https://graph.facebook.com/v21.0";

function toDateString(d: Date): string {
    return d.toISOString().slice(0, 10);
}

async function setAccountStatus(accountId: string, status: "active" | "needs_reauth" | "error") {
    const { error } = await supabaseAdmin
        .from("account")
        .update({ status })
        .eq("id", accountId);

    if (error) console.error("Failed to update account status", error);
}

function isAuthError(data: any): boolean {
    return data?.error?.type === "OAuthException";
}

function handleMetaApiError(context: string, data: any): never {
    if (isAuthError(data)) {
        throw new TokenError("REAUTH_REQUIRED", "Meta token is no longer valid", 401);
    }
    throw new Error(`Failed at ${context}`);
}

async function sumMediaViews(pageId: string, token: string): Promise<number> {
    const WINDOW_SECONDS = 80 * 24 * 60 * 60;
    const now = Math.floor(Date.now() / 1000);
    const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60;

    let total = 0;
    let windowStart = twoYearsAgo;
    let safetyCounter = 0;

    while (windowStart < now && safetyCounter < 30) {
        safetyCounter++;
        const windowEnd = Math.min(windowStart + WINDOW_SECONDS, now);

        let url: string | null =
            `${GRAPH}/${pageId}/insights?metric=page_media_view&period=day&since=${windowStart}&until=${windowEnd}`;
        let innerSafety = 0;

        while (url && innerSafety < 10) {
            innerSafety++;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const data: any = await res.json();

            if (!res.ok || data.error) {
                handleMetaApiError("sumMediaViews", data);
            }

            const values = data.data?.[0]?.values ?? [];
            for (const v of values) total += Number(v.value ?? 0);

            url = data.paging?.next ?? null;
        }

        windowStart = windowEnd;
    }

    return total;
}

async function sumPostLikes(pageId: string, token: string): Promise<number> {
    let url: string | null = `${GRAPH}/${pageId}/posts?fields=likes.summary(true)&limit=100`;
    let total = 0;
    let safetyCounter = 0;

    while (url && safetyCounter < 50) {
        safetyCounter++;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data: any = await res.json();

        if (!res.ok || data.error) {
           handleMetaApiError("sumPostLikes", data);
        }

        const posts = data.data ?? [];
        for (const p of posts) total += Number(p.likes?.summary?.total_count ?? 0);

        url = data.paging?.next ?? null;
    }

    return total;
}

export type MetaSnapshotResult = {
    account_id: string;
    date: string;
    views: number;
    likes: number;
    followers: number;
};

export async function collectFacebookSnapshot(accountId: string): Promise<MetaSnapshotResult> {
    try {
        const { data: account } = await supabaseAdmin
            .from("account")
            .select("platform_account_id")
            .eq("id", accountId)
            .maybeSingle();
        
        if (!account) throw new Error("Account not found");
        const pageId = account.platform_account_id;

        const token = await getMetaPageToken(accountId);

        const fanRes = await fetch(`${GRAPH}/${pageId}?fields=fan_count`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const fanData = await fanRes.json();
        if (!fanRes.ok || fanData.error) {
            handleMetaApiError("fan_count", fanData);
        }

        const followers = Number(fanData.fan_count ?? 0);
        const views = await sumMediaViews(pageId, token);
        const likes = await sumPostLikes(pageId, token);

        const today = toDateString(new Date());
        const { error: upsertError } = await supabaseAdmin
            .from("metric")
            .upsert(
                { account_id: accountId, date: today, views, likes, followers },
                { onConflict: "account_id,date" }
            );
        
        if (upsertError) {
            console.error("Metric upsert error: ", upsertError);
            throw new Error("Failed to store metric snapshot");
        }

        await setAccountStatus(accountId, "active");
        return { account_id: accountId, date: today, views, likes, followers };
    } catch (err) {
        if (err instanceof TokenError) {
            await setAccountStatus(accountId, err.code === "REFRESH_FAILED" ? "error" : "needs_reauth");
        } else {
            await setAccountStatus(accountId, "error");
        }
        throw err;
    }
}
