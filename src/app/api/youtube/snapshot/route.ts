import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getValidAccessToken, TokenError } from "@/lib/youtubeAuth";

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
        const accessToken = await getValidAccessToken(accountId);

        //TEMP
        console.log("[snapshot] token hossz:", accessToken?.length, "prefix:", accessToken?.slice(0, 6));

        const channelResponse = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const channelData = await channelResponse.json();

        if (!channelResponse.ok || channelData.items?.length) {
            console.error("Failed to fetch channel data", channelData);
            await supabaseAdmin.from("account").update({ status: "error" }).eq("id", accountId);
            return NextResponse.json(
                { error: "Failed to fetch channel data" },
                { status: channelResponse.status || 400 }
            );
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
            await supabaseAdmin.from("account").update({ status: "error" }).eq("id", accountId);
            return NextResponse.json(
                { error: "Failed to fetch analytics (likes)" },
                { status: analyticsResponse.status || 400 }
            );
        }

        const likes = Number(analyticsData.rows?.[0]?.[0] ?? 0);
        const today = toDateString(new Date());

        const { error: upsertError } = await supabaseAdmin
            .from("metric")
            .upsert(
                { account_id: accountId, date: today, views, likes, followers },
                { onConflict: "account_id,date"}
            );
        
        if (upsertError) {
            console.error("Failed to store metric snapshot");
            return NextResponse.json(
                { error: "Failed to store metric snapshot" },
                { status: 500 }
            );
        }

        await supabaseAdmin.from("account").update({ status: "active" }).eq("account_id", accountId);

        return NextResponse.json({
            message: "Snapshot stored successfully",
            account_id: accountId,
            date: today,
            views,
            likes,
            followers,
            likes_period: { start: startDate, end: endDate },
        });
    } catch (err) {
        if (err instanceof TokenError) {
            const newStatus = err.code === "REFRESH_FAILED" ? "error" : "needs_reauth";
            await supabaseAdmin.from("account").update({ status: newStatus }).eq("account_id", accountId);

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