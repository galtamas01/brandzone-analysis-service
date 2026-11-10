import styles from "../public.module.css";
import { APP_NAME, OPERATOR_NAME, CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/legal";

export const metadata = { title: `Privacy Policy - ${APP_NAME}` };

export default function PrivacyPage() {
    return (
        <main className={styles.main}>
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.lead}>
                This policy explains what data {APP_NAME}, operated by {OPERATOR_NAME}, accesses, how it
                is used and how it is protected.
            </p>

            <section className={styles.section}>
                <h2 className={styles.heading}>Data we access</h2>
                <p>
                    When a channel is connected, we receive from Google: the channel identifier and name, the
                    channel&apos;s total view and subscriber counts, and its aggregate like count. We also
                    receive the OAuth access and refresh tokens that allow us to read these figures. We do
                    not access videos, comments, private messages or any other content.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>How we use it</h2>
                <p>
                    The data is used only to build performance reports about the connected channel. The same
                    applies to accounts connected from other social platforms. We do not use the data for
                    advertising, we do not sell it, and we do not use it to develop, improve or train
                    generalized AI or machine learning models.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Who sees it</h2>
                <p>
                    The figures are visible to authenticated staff of {OPERATOR_NAME} and are included in
                    reports delivered to the owner of the channel. We do not share Google user data with any
                    other third party. It is processed on our behalf by two infrastructure providers: Vercel
                    (application hosting) and Supabase (database hosting).
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Storage and security</h2>
                <p>
                    OAuth tokens are encrypted before they are stored (AES-256-GCM) and are decrypted only
                    on the server when a request to Google is made. They are never sent to the browser.
                    Access to the application is restricted to authenticated staff, and data is transmitted
                    over encrypted connections.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Retention, revocation and deletion</h2>
                <p>
                    Daily totals and tokens are kept while a channel remains connected. You can revoke access
                    at any time at{" "}
                    <a className={styles.link} href="https://myaccount.google.com/permissions">
                        myaccount.google.com/permissions
                    </a>
                    , after which the application can no longer read your data. On request we delete the
                    connected account together with its tokens and stored figures.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Google API Services User Data Policy</h2>
                <p>
                    {APP_NAME}&apos;s use and transfer to any other app of information received from Google
                    APIs will adhere to the{" "}
                    <a
                        className={styles.link}
                        href="https://developers.google.com/terms/api-services-user-data-policy"
                    >
                        Google API Services User Data Policy
                    </a>
                    , including the Limited Use requirements.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Contact</h2>
                <p>
                    Requests about your data: <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                </p>
            </section>

            <p className={styles.meta}>Last updated: {POLICY_UPDATED}</p>
        </main>
    );
}