import { NextResponse } from "next/server";
import { getValidAccessToken, TokenError } from "@/lib/youtubeAuth";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("account_id");

    if (!accountId) {
        return NextResponse.json(
            { error: "Missing account_id query parameter" },
            { status: 400 }
        )
    }

    try {
        const accessToken = await getValidAccessToken(accountId);

        const statsResponse = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const statsData = await statsResponse.json();

        if (!statsResponse.ok || !statsData.items?.length) {
            console.error("YouTube stats error: ", statsData);
            return NextResponse.json(
                { error: "Failed to fetch channel statistics" },
                { status: statsResponse.status || 400 }
            );
        }

        const channel = statsData.items[0];
        const stats = channel.statistics;

        return NextResponse.json({
            account_id: accountId,
            channel_id: channel.id,
            channel_title: channel.snippet?.title ?? "",
            views: Number(stats.viewCount),
            subscribers: stats.hiddenSubscriberCount ? null: Number(stats.subscriberCount),
            videos: Number(stats.videoCount),
            subscriber_hidden: Boolean(stats.hiddenSubscriberCount),
        });
    } catch (err) {
        if (err instanceof TokenError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }

        console.error("Server error", err);
        return NextResponse.json(
            { error: "Server error occured" },
            { status: 500 }
        );
    }
    
}