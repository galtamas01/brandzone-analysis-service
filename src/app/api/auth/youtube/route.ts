import { NextResponse } from "next/server";
import { isUuid, issueOAuthState } from "@/lib/oauthState";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { error: "Missing Google OAuth configuration from .env.local" },
            { status: 500 }
        );
    }

    const { searchParams } = new URL(request.url);
    const partnerClientId = searchParams.get("client_id");
    if (!partnerClientId || !isUuid(partnerClientId)) {
        return NextResponse.json({ error: "Missing or invalid client_id query parameter." }, { status: 400 });
    }

    const scopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly'
    ];

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    googleAuthUrl.searchParams.append('client_id', clientId);
    googleAuthUrl.searchParams.append('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.append('response_type', 'code');
    googleAuthUrl.searchParams.append('scope', scopes.join(' '));
    googleAuthUrl.searchParams.append('access_type', 'offline');
    googleAuthUrl.searchParams.append('prompt', 'consent');
    googleAuthUrl.searchParams.append('state', await issueOAuthState("youtube", partnerClientId));
    
    return NextResponse.redirect(googleAuthUrl.toString());
}

