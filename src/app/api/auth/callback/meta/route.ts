import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encrypt } from "@/lib/encryption";
import { fetchManagedPages, saveMetaAccounts } from "@/lib/metaConnect";
import { verifyOAuthState } from "@/lib/oauthState";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.url));

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    if (error) return redirectTo(`/?error=oauth_denied`);
    if (!code) return redirectTo(`/?error=missing_code`);
    if (!state) return redirectTo(`/?error=missing_state`);

    const partnerClientId = await verifyOAuthState("meta", state);
    if (!partnerClientId) return redirectTo(`/?error=invalid_state`);

    try {
        const tokenUrl = new URL("https://graph.facebook.com/v26.0/oauth/access_token");
        tokenUrl.searchParams.append("client_id", process.env.META_APP_ID!);
        tokenUrl.searchParams.append("client_secret", process.env.META_APP_SECRET!);
        tokenUrl.searchParams.append("redirect_uri", process.env.META_REDIRECT_URI!);
        tokenUrl.searchParams.append("code", code);

        const tokenResponse = await fetch(tokenUrl.toString());
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData?.access_token) {
            console.error("Meta token exchange error: ", tokenData);
            return redirectTo(`/clients/${partnerClientId}?error=token_exchange`);
        }
        const shortLivedToken = tokenData.access_token;

        const longUrl = new URL("https://graph.facebook.com/v26.0/oauth/access_token");
        longUrl.searchParams.append("grant_type", "fb_exchange_token");
        longUrl.searchParams.append("client_id", process.env.META_APP_ID!);
        longUrl.searchParams.append("client_secret", process.env.META_APP_SECRET!);
        longUrl.searchParams.append("fb_exchange_token", shortLivedToken);

        const longResponse = await fetch(longUrl.toString());
        const longData = await longResponse.json();
        if (!longResponse.ok || !longData.access_token) {
            console.error("Meta long-lived token error: ", longData);
            return redirectTo(`/clients/${partnerClientId}?error=long_lived`);
        }
        const longLivedToken = longData.access_token;

        const pages = await fetchManagedPages(longLivedToken);
        console.error("[meta] fetchManagedPages raw result: ", JSON.stringify(pages));
        if (pages.length === 0) {
            return redirectTo(`/clients/${partnerClientId}?error=no_pages`);
        }
        if (pages.length === 1) {
            await saveMetaAccounts(partnerClientId, pages[0]);
            return redirectTo(`/clients/${partnerClientId}?connected=meta`);
        }

        const cookieStore = await cookies();
        cookieStore.set("meta_user_token", encrypt(longLivedToken), {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 600,
            path: "/",
        });

        return redirectTo(`/clients/${partnerClientId}/select-meta-page`);
    } catch (err) {
        console.error("Meta callback server error: ", err);
        return redirectTo(`/?error=server_error`);
    }
}

