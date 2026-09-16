import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/encryption";
import { fetchManagedPages } from "@/lib/metaConnect";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function SelectMetaPage({ params } : { params: Promise<{ id: string }> }) {
    const { id: clientId } = await params;

    const cookieStore = await cookies();
    const enc = cookieStore.get("meta_user_token")?.value;
    if (!enc) {
        redirect(`/clients/${clientId}?error=meta_session_expired`);
    }

    const userToken = decrypt(enc);
    const pages = await fetchManagedPages(userToken);

    return (
        <main className={styles.main}>
            <h1 className={styles.title}>Select a Facebook page</h1>
            <p className={styles.subtitle}>Choose which Page to connect. Its linked Instagram account (if any) will be added too.</p>

            <ul className={styles.list}>
                {pages.map((page) => (
                    <li key={page.id}>
                        <form action="/api/auth/meta/select" method="POST" className={styles.row}>
                            <input type="hidden" name="client_id" value={clientId} />
                            <input type="hidden" name="page_id" value={page.id} />
                            <div className={styles.info}>
                                <span className={styles.name}>{page.name}</span>
                                {page.instagram_business_account?.username && (
                                    <span className={styles.ig}>
                                        Instagram: @{page.instagram_business_account.username}
                                    </span>
                                )}
                            </div>
                            <button type="submit" className={styles.button}>Connect</button>
                        </form>
                    </li>
                ))}
            </ul>
        </main>
    );
}