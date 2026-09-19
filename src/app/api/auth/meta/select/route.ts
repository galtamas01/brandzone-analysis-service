import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/encryption";
import { fetchManagedPages, saveMetaAccounts } from "@/lib/metaConnect";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const redirectTo = (path: string) =>
        NextResponse.redirect(new URL(path, request.url), { status: 303 });

    const formData = await request.formData();
    const clientId = formData.get("client_id")?.toString();
    const pageId = formData.get("page_id")?.toString();

    if (!clientId || !pageId) return redirectTo(`/?error=invalid_selection`);

    const cookieStore = await cookies();
    const enc = cookieStore.get("meta_user_token")?.value;
    if (!enc) return redirectTo(`/clients/${clientId}?error=meta_session_expired`);

    try {
        const userToken = decrypt(enc);
        const pages = await fetchManagedPages(userToken);
        const selected = (await pages).find((p) => p.id === pageId);

        if (!selected) return redirectTo(`/clients/${clientId}?error=page_not_found`);

        await saveMetaAccounts(clientId, selected);
        cookieStore.delete("meta_user_token");

        return redirectTo(`/clients/${clientId}?connected=meta`);
    } catch(err) {
        console.error("Meta select error: ", err);
        return redirectTo(`/clients/${clientId}?error=server_error`);
    }
}