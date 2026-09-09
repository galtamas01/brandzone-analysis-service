import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { notFound } from "next/navigation";
import 'material-symbols/outlined.css';
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Account = {
    id: string;
    platform: string;
    name: string;
    platform_account_id: string | null;
    status: "active" | "needs_reauth" | "error"
};

const STATUS_LABEL: Record<Account["status"], string> = {
    active: "OK",
    needs_reauth: "Reconnect required",
    error: "Temporary error"
}

export default async function ClientDetailPage({
    params, searchParams,}: {
        params: Promise<{ id: string }>;
        searchParams: Promise<{ connected?: string; error?: string }>;
}) {
    const { id } = await params;
    const { connected, error: connectError } = await searchParams;

    const { data: client, error: clientError } = await supabaseAdmin
        .from("client")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();

    if (clientError) throw new Error(clientError.message);
    if (!client) notFound();

    const { data: accounts } = await supabaseAdmin
        .from("account")
        .select("id, platform, name, platform_account_id, status")
        .eq("client_id", id)
        .order("platform", { ascending: true });

    return (
        <main className={styles.main}>
            <Link href="/" className={styles.back}>← Back to clients list</Link>

            <h1 className={styles.title}>{client.name}</h1>

            {connected && (
                <div className={styles.bannerSuccess}>YouTube account has been connected successfully</div>
            )}
            {connectError &&
                <div className={styles.bannerError}>Connection failed: {connectError}</div>
            }

            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Connected accounts</h2>
                    <a className={styles.connectButton} href={`/api/auth/youtube?client_id=${client.id}`}>
                        <span className="material-symbols-outlined">add</span>
                        Add YouTube account
                    </a>
                </div>
            </section>

            {(!accounts || accounts.length === 0) ? (
                <p className={styles.empty}>No account connected to this client</p>
            ) : (
                <ul className={styles.list}>
                    {accounts.map((account: Account) => (
                        <li key={account.id} className={styles.accountRow}>
                            <div className={styles.accountInfo}>
                                <span className={styles.platform}>{account.platform}</span>
                                <span className={styles.accountName}>{account.name}</span>
                            </div>
                            <span className={styles.status} data-status={account.status}>
                                {STATUS_LABEL[account.status]}
                            </span>
                        </li>
                    ))}
                </ul>
            )
        }
        </main>
    )
}