import Link from "next/link";
import styles from "../public.module.css";
import { APP_NAME, OPERATOR_NAME, CONTACT_EMAIL } from "@/lib/legal";

export const metadata = { title: `About - ${APP_NAME}` };

export default function AboutPage() {
    return (
        <main className={styles.main}>
            <h1 className={styles.title}>{APP_NAME}</h1>
            <p className={styles.lead}>
                {APP_NAME} is a reporting tool operated by {OPERATOR_NAME}. It collects the public
                performance figures of social media accounts and turns them into periodic PDF reports
                for the owners of those accounts.
            </p>

            <section className={styles.section}>
                <h2 className={styles.heading}>What the application does</h2>
                <p>
                    The owner of a YouTube channel, or someone authorised to manage it, connects the channel
                    to the application by signing in with Google and granting read-only access. Once a day
                    the application stores three totals for the channel: total views, total likes and
                    subscribers. A report generated on request shows how these totals changed over a chosen
                    period.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Google access and why it is needed</h2>
                <ul>
                    <li>
                        <strong>youtube.readonly</strong> - used to read the channel&apos;s name, identifier and
                        its total view and subscriber counts.
                    </li>
                    <li>
                        <strong>yt-analytics.readonly</strong> - used to read the channel&apos;s aggregate
                        like count from YouTube Analytics.
                    </li>
                </ul>
                <p>
                    Access is read-only. The application cannot change, upload or delete anything on a
                    channel.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Your data</h2>
                <p>
                    How the data is stored, protected and deleted is described in the{" "}
                    <Link href="/privacy" className={styles.link}>Privacy Policy</Link>. Access can be
                    revoked at any time at{" "}
                    <a className={styles.link} href="https://myaccount.google.com/permissions">
                        myaccount.google.com/permissions
                    </a>.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Contact</h2>
                <p>
                    Questions about the application: <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                    Staff of {OPERATOR_NAME} can <Link href="/login" className={styles.link}>sign in</Link> to
                    the application.
                </p>
            </section>
        </main>
    );
}