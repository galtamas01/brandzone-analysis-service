import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    if (error) return NextResponse.json({ error: "oauth_denied", detail: error }, { status: 400 });
    if (!code) return NextResponse.json({ error: "missing_code" }, { status: 400 });
    if (!state) return NextResponse.json({ error: "missing_state" }, { status: 400 });

    try {
        const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
        tokenUrl.searchParams.append("client_id", process.env.META_APP_ID!);
        tokenUrl.searchParams.append("client_secret", process.env.META_APP_SECRET!);
        tokenUrl.searchParams.append("redirect_uri", process.env.META_REDIRECT_URI!);
        tokenUrl.searchParams.append("code", code);

        const tokenResponse = await fetch(tokenUrl.toString());
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData?.access_token) {
            console.error("Meta token exchange error: ", tokenData);
            return NextResponse.json({ step: "token_exchange", error: tokenData }, { status: 400 });
        }
        const shortLivedToken = tokenData.access_token;

        const longUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
        longUrl.searchParams.append("grant_type", "fb_exchange_token");
        longUrl.searchParams.append("client_id", process.env.META_APP_ID!);
        longUrl.searchParams.append("client_secret", process.env.META_APP_SECRET!);
        longUrl.searchParams.append("fb_exchange_token", shortLivedToken);

        const longResponse = await fetch(longUrl.toString());
        const longData = await longResponse.json();
        if (!longResponse.ok || !longData.access_token) {
            console.error("Meta long-lived token error: ", longData);
            return NextResponse.json({ step: "long_lived", error: longData }, { status: 400 });
        }
        const longLivedToken = longData.access_token;

        const pagesUrl = new URL("https://graph.facebook.com/v21.0/me/accounts");
        pagesUrl.searchParams.append(
            "fields",
            "id,name,access_token,instagram_business_account{id,username}"
        );
        pagesUrl.searchParams.append("access_token", longLivedToken);

        const pagesResponse = await fetch(pagesUrl.toString());
        const pagesData = await pagesResponse.json();
        if (!pagesResponse.ok) {
            console.error("Meta pages fetch error: ", pagesData);
            return NextResponse.json({ step: "pages", error: pagesData }, { status: 400 });
        }

        return NextResponse.json({
            client_id: state,
            page_count: pagesData.data?.length ?? 0,
            pages: pagesData.data,
        });
    } catch (err) {
        console.error("Meta callback server error: ", err);
        return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
}

