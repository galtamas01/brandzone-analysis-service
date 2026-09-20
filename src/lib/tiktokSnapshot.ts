import { supabaseAdmin } from "./supabaseAdmin";
import { getValidTiktokAccessToken } from "./tiktokAuth";
import { TokenError } from "./tokens";
import { type SnapshotResult, setAccountStatus, finalizeSnapshot } from "./snapshotHelpers";

async function sumVideoViews(accessToken: string): Promise<number> {
    let totalViews = 0;
    let cursor: number | undefined = undefined;
    let hasMore = true;
    let safetyCounter = 0;

    while (hasMore && safetyCounter < 100) {
        safetyCounter++;

        const body: Record<string, unknown> = { max_count: 20 };
        if (cursor !== undefined) body.cursor = cursor;

        const response = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,view_count",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );
        const data = await response.json();

        if (!response.ok || data.error?.code !== "ok") {
            console.error("TikTok video list error", data);
            throw new Error("Failed tot fetch video list");
        }

        const videos = data.data?.videos ?? [];
        for (const v of videos) {
            totalViews += Number(v.view_count ?? 0);
        }

        hasMore = Boolean(data.data?.has_more);
        cursor = data.data?.cursor;
    }

    return totalViews;
}

export async function collectTiktokSnapshot(accountId: string): Promise<SnapshotResult> {
    try {
        const accessToken = await getValidTiktokAccessToken(accountId);

        const fields = "follower_count,likes_count";
        const userInfoResponse = await fetch(
            `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const userInfoData = await userInfoResponse.json();

        if (!userInfoResponse.ok || userInfoData.error?.code !== "ok") {
            console.error("TikTok user info error: ", userInfoData);
            throw new Error("Failed to fetch user info");
        }

        const followers = Number(userInfoData.data?.user?.follower_count ?? 0);
        const likes = Number(userInfoData.data?.user?.likes_count ?? 0);
        const views = await sumVideoViews(accessToken);

        return await finalizeSnapshot(accountId, { views, likes, followers });
    } catch (err) {
        if (err instanceof TokenError) {
            await setAccountStatus(accountId, err.code === "REFRESH_FAILED" ? "error" : "needs_reauth");
        } else {
            await setAccountStatus(accountId, "error");
        }
        throw err;
    }
}
