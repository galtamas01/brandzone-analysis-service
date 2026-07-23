import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decrypt } from "@/lib/encryption";

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
        const { data: tokenRow, error: tokenError } = await supabaseAdmin
        .from("oauth_token")
        .select("access_token, expires_at")
        .eq("account_id", accountId)
        .maybeSingle();
    
        if (tokenError) {
            console.error("Token lookup error: ", tokenError);
            return NextResponse.json(
                { error: "Failed to lookup token" },
                { status: 500 }
            );
        }

        if (!tokenRow) {
            return NextResponse.json(
                { error: "No token found for this account. Connect the account first!" },
                { status: 404 }
            )
        }

        if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
            return NextResponse.json(
                { error: "Access token expired",
                expired_at: tokenRow.expires_at },
                { status: 401 }
            )
        }
        const accessToken = decrypt(tokenRow.access_token);

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
        console.error("Server error", err);
        return NextResponse.json(
            { error: "Server error occured" },
            { status: 500 }
        );
    }
    
}