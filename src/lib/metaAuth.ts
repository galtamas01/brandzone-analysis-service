import { supabaseAdmin } from "./supabaseAdmin";
import { decrypt } from "./encryption";
import { TokenError } from "./youtubeAuth";

export async function getMetaPageToken(accountId: string): Promise<string> {
    const { data: tokenRow, error } = await supabaseAdmin
        .from("oauth_token")
        .select("access_token")
        .eq("account_id", accountId)
        .maybeSingle();
    
    if (error) {
        console.error("Meta token lookup error: ", error);
        throw new TokenError("REFRESH_FAILED", "Failed to lookup token", 500);
    }
    if (!tokenRow) {
        throw new TokenError("NO_TOKEN", "No token found for this account. Connect the account first", 404);
    }

    return decrypt(tokenRow.access_token);
}

