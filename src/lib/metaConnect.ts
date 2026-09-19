import { supabaseAdmin } from "./supabaseAdmin";
import { encrypt } from "./encryption";

export type MetaPage = {
    id: string,
    name: string,
    access_token: string,
    instagram_business_account?: { id: string; username?: string};
}

export async function fetchManagedPages(userToken: string): Promise<MetaPage[]> {
    const url = new URL("https://graph.facebook.com/v21.0/me/accounts");
    url.searchParams.append("fields", "id,name,access_token,instagram_business_account{id,username}");
    //url.searchParams.append("fields", "id,name,access_token");
    url.searchParams.append("access_token", userToken);

    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) {
        console.error("Meta pages fetch error: ", data);
        throw new Error("Failed to fetch managed pages");
    }

    const pages: MetaPage[] = data.data ?? [];
    return pages;
}

async function upsertAccountWithToken(
    clientId: string,
    platform: "facebook" | "instagram",
    platformAccountId: string,
    name: string,
    encryptedToken: string
) {
    const { data: existing, error: lookupError } = await supabaseAdmin
        .from("account")
        .select("id")
        .eq("client_id", clientId)
        .eq("platform", platform)
        .eq("platform_account_id", platformAccountId)
        .maybeSingle();

    if (lookupError) throw new Error(`Account lookup failed: ${lookupError.message}`);

    let accountId: string;
    if (existing) {
        accountId = existing.id;
        await supabaseAdmin
            .from("account")
            .update({ name, status: "active" })
            .eq("id", accountId);
    } else {
        const { data: inserted, error: insertError } = await supabaseAdmin
            .from("account")
            .insert({ client_id: clientId, platform, name, platform_account_id: platformAccountId, status: "active" })
            .select("id")
            .single();
        
        if (insertError || !inserted) throw new Error(`Account insert failed: ${insertError.message}`);
        accountId = inserted.id;
    }

    const { error: tokenError } = await supabaseAdmin
        .from("oauth_token")
        .upsert(
            { account_id: accountId, access_token: encryptedToken, expires_at: null, refresh_token: null },
            { onConflict: "account_id" }
        );

        if (tokenError) throw new Error(`Token save failed ${tokenError.message}`);
}

export async function saveMetaAccounts(clientId: string, page: MetaPage) {
    const encryptedToken = encrypt(page.access_token);

    await upsertAccountWithToken(clientId, "facebook", page.id, page.name, encryptedToken);
    
    const ig = page.instagram_business_account;
    if (ig?.id) {
        const igName = ig.username ? `@${ig.username}` : "Instagram";
        await upsertAccountWithToken(clientId, "instagram", ig.id, igName, encryptedToken);
    }
}