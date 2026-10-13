import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encrypt } from "@/lib/encryption";
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

    const partnerClientId = await verifyOAuthState("tiktok", state);
    if (!partnerClientId) return redirectTo(`/?error=invalid_state`);

    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get("tiktok_code_verifier")?.value;
    if (!codeVerifier) {
        return redirectTo(`/clients/${partnerClientId}?error=missing_verifier`);
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
            return redirectTo(`/clients/${partnerClientId}?error=token_exchange`);
        }

        const accessToken: string = tokenData.access_token;
        const refreshToken: string | undefined = tokenData.refresh_token;
        const expiresIn: number = tokenData.expires_in;
        const openId: string = tokenData.open_id;
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        const userInfoResponse = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const userInfoData = await userInfoResponse.json();
        if (!userInfoResponse.ok || userInfoData.error?.code !== "ok") {
            console.error("TikTok user info error: ", userInfoData);
            return redirectTo(`/clients/${partnerClientId}?error=user_info`);
        }

        const displayName: string = userInfoData.data?.user?.display_name || "TikTok account";
        const accountOpenId = openId || userInfoData?.data?.user?.open_id;

        const { data: existingAccount, error: lookupError } = await supabaseAdmin
            .from("account")
            .select("id")
            .eq("client_id", partnerClientId)
            .eq("platform", "tiktok")
            .eq("platform_account_id", accountOpenId)
            .maybeSingle();
        
        if (lookupError) {
            console.error("Account lookup error: ", lookupError);
            return redirectTo(`/clients/${partnerClientId}?error=account_save`);
        }

        let accountId: string;
        if (existingAccount) {
            accountId = existingAccount.id;
            await supabaseAdmin.from("account").update({ name: displayName, status: "active" }).eq("id", accountId);
        } else {
            const { data: newAccount, error: insertError } = await supabaseAdmin
                .from("account")
                .insert({
                    client_id: partnerClientId,
                    platform: "tiktok",
                    name: displayName,
                    platform_account_id: accountOpenId,
                    status: "active",
                })
                .select("id")
                .single();

            if (insertError || !newAccount) {
                console.error("Account insert error", insertError);
                return redirectTo(`/clients/${partnerClientId}?error=account_save`);
            }
            accountId = newAccount.id;
        }

        const tokenRow: Record<string, unknown> = {
            account_id: accountId,
            access_token: encrypt(accessToken),
            expires_at: expiresAt
        };
        if (refreshToken) tokenRow.refresh_token = encrypt(refreshToken);

        const { error: tokenUpsertError } = await supabaseAdmin 
            .from("oauth_token")
            .upsert(tokenRow, { onConflict: "account_id" });
        
        if (tokenUpsertError) {
            console.error("Token upsert error", tokenUpsertError);
            return redirectTo(`/clients/${partnerClientId}?error=token_save`);
        }

        cookieStore.delete("tiktok_code_verifier");

        return redirectTo(`/clients/${partnerClientId}?connected=tiktok`);
    } catch (err) {
        console.error("Server error ", err);
        return redirectTo(`/?error=server_error`);
    }
}