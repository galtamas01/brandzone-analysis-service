import { supabaseAdmin } from "./supabaseAdmin";

export type SnapshotResult = {
    account_id: string;
    date: string;
    views: number;
    likes: number;
    followers: number;
}

export function toDateString(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export async function setAccountStatus(accountId: string, status: "active" | "needs_reauth" | "error") {
    const { error } = await supabaseAdmin
        .from("account")
        .update({ status })
        .eq("id", accountId);
    if (error) console.error("Failed to update account status: ", error);
}

export async function finalizeSnapshot(accountId: string, metrics: { views: number, likes: number, followers: number }) {
    const today = toDateString(new Date());
    const { error: upsertError } = await supabaseAdmin
        .from("metric")
        .upsert(
            { account_id: accountId, date: today, ...metrics },
            { onConflict: "account_id,date" }
        );
    
    if (upsertError) {
        console.error("Metric upsert error: ", upsertError);
        throw new Error("Failed to store metric snapshot");
    }
    await setAccountStatus(accountId, "active");

    return { account_id: accountId, date: today, ...metrics };
}

