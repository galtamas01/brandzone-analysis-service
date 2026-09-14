import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function base64url(input: Buffer): string {
    return input
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export async function GET() {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;

    if (!clientKey || !redirectUri) {
        return NextResponse.json(
            { error: "Missing TikTok OAuth configuration"},
            { status: 500 }
        );
    }

    const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());

    const cookieStore = await cookies();
    cookieStore.set("tiktok_code_verifier", codeVerifier, {
        httpOnly: true,
        secure: true,
        maxAge: 600,
        path: "/",
    });

    const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
    authUrl.searchParams.append("client_key", clientKey);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", "user.info.basic,user.info.stats");
    authUrl.searchParams.append("state", "spike-test");
    authUrl.searchParams.append("code_challenge", codeChallenge);
    authUrl.searchParams.append("code_challenge_method", "S256");

    return NextResponse.redirect(authUrl.toString());
}