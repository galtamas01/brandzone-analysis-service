import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const appId = process.env.META_APP_ID;
    const redirectUri = process.env.META_REDIRECT_URI;
    const configId = process.env.META_CONFIG_ID;

    if (!appId || !redirectUri || !configId) {
        return NextResponse.json({ error: "Missing Meta OAuth configuration" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const partnerClientId = searchParams.get("client_id");
    if (!partnerClientId) {
        return NextResponse.json({ error: "Missing client_id query parameter" }, { status: 400 });
    }

    const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    authUrl.searchParams.append("client_id", appId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("config_id", configId);
    authUrl.searchParams.append("state", partnerClientId);

    return NextResponse.redirect(authUrl.toString());
}