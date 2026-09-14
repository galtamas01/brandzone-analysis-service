import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
        return NextResponse.json({ error: `TikTok error: ${error}` }, { status: 400 });
    }
    if (!code) {
        return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get("tiktok_code_verifier")?.value;
    if (!codeVerifier) {
        return NextResponse.json({ error: "Missing code_verifier cookie - restart the flow from /api/auth/tiktok"}, { status: 400 });
    }

    try {
        const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY!,
                client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                code,
                grant_type: "authorization_code",
                redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
                code_verifier: codeVerifier,
            }).toString(),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error("TikTok token exchange error");
            return NextResponse.json(
                { step: "token_exchange", error: tokenData.error },
                { status: 400 }
            );
        }

        const fields = [
            "open_id",
            "display_name",
            "follower_count",
            "following_count",
            "likes_count",
            "video_count",
        ].join(",");

        const userInfoResponse = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
            { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
        );
        const userInfoData = await userInfoResponse.json();

        cookieStore.delete("tiktok_code_verifier");

        return NextResponse.json({
            token_scope: tokenData.scope,
            userInfo: userInfoData
        });
    } catch (err) {
        console.error("TikTok spike error: ", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}