import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getValidAccessToken} from "@/lib/youtubeAuth";
import { TokenError } from "./tokens";
import { type SnapshotResult, finalizeSnapshot, setAccountStatus, toDateString } from "./snapshotHelpers";

export async function collectYoutubeSnapshot(accountId: string): Promise<SnapshotResult> {
    try {
            const accessToken = await getValidAccessToken(accountId);
    
            const channelResponse = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const channelData = await channelResponse.json();
    
            if (!channelResponse.ok || !channelData.items?.length) {
                console.error("Failed to fetch channel data", channelData);
                throw new Error("Failed to fetch channel data");
            }
    
            const channel = channelData.items[0];
            const stats = channel.statistics;
            const views = Number(stats.viewCount);
            const followers = stats.hiddenSubscriberCount ? 0 : Number(stats.subscriberCount);
            const channelPublishedAt = channel.snippet?.publishedAt;
    
            const startDate = channelPublishedAt ? toDateString(new Date(channelPublishedAt)) : "2005-01-01";
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
            const endDate = toDateString(yesterday);
    
            const analyticsUrl = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
            analyticsUrl.searchParams.append("ids", "channel==MINE");
            analyticsUrl.searchParams.append("startDate", startDate);
            analyticsUrl.searchParams.append("endDate", endDate);
            analyticsUrl.searchParams.append("metrics", "likes");
            
            const analyticsResponse = await fetch(analyticsUrl.toString(), {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const analyticsData = await analyticsResponse.json();
    
            if (!analyticsResponse.ok) {
                console.error("YouTube Analytics error: ", analyticsData);
                throw new Error("Failed to fetch analytics (likes)");
            }
    
            const likes = Number(analyticsData.rows?.[0]?.[0] ?? 0);

            return await finalizeSnapshot(accountId, { views, likes, followers });
        } catch(err) {
            if (err instanceof TokenError) {
                await setAccountStatus(accountId, err.code === "REFRESH_FAILED" ? "error" : "needs_reauth");
            } else {
                await setAccountStatus(accountId, "error");
            }
            throw err;
        }
}