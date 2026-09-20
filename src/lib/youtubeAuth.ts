import { supabaseAdmin } from "./supabaseAdmin";
import { encrypt, decrypt } from "./encryption";
import { TokenError } from "./tokens";

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export async function getValidAccessToken(accountId: string): Promise<string> {
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
        .from("oauth_token")
        .select("access_token, refresh_token, expires_at")
        .eq("account_id", accountId)
        .maybeSingle();
    
    if (tokenError) {
        console.error("Token lookup error: ", tokenError);
        throw new TokenError("REFRESH_FAILED", "Failed to look up token", 500);
    }

    if (!tokenRow) {
        throw new TokenError("NO_TOKEN", "No token found for this account. Connect the account first", 404);
    }

    const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
    const stillValid = expiresAt - EXPIRY_BUFFER_MS > Date.now();

    if (stillValid) {
        return decrypt(tokenRow.access_token);
    }

    if (!tokenRow.refresh_token) {
        throw new TokenError("NO_REFRESH_TOKEN", "Access token expired and no refresh token found. Reconnect the account", 401)
    }

    const refreshToken = decrypt(tokenRow.refresh_token);

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }).toString(),
    });

    const data = await response.json();
    if (!response.ok) {
        console.error("Google token refresh error", data);
        
        if (data?.error === "invalid_grant") {
            throw new TokenError("REAUTH_REQUIRED", "Refresh token is no longer valid. The account must be reconnected.", 401);
        }

        throw new TokenError("REFRESH_FAILED", "Failed to refresh access token", 502);
    }

    const newAccessToken: string = data.access_token;
    const newExpiresIn: number = data.expires_in;
    const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString();

    const updateRow: Record<string, unknown> = {
        access_token: encrypt(newAccessToken),
        expires_at: newExpiresAt,
    };
    if (data.refresh_token) {
        updateRow.refresh_token = encrypt(data.refresh_token);
    }

    const { error: updateError } = await supabaseAdmin
        .from("oauth_token")
        .update(updateRow)
        .eq("account_id", accountId);

    if (updateError) {
        console.error("Token update error after refresh: ", updateError)
    }

    return newAccessToken;
}