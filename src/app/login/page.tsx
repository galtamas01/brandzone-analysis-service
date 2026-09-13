import LoginForm from "@/components/LoginForm/LoginForm";
import styles from "./page.module.css"

export default function LoginPage() {
    return (
        <main className={styles.main}>
            <div className={styles.card}>
                <div className={styles.logoWrapper}><img src="/brandzone-menu-logo.png" alt="BrandZone logo" /></div>
                <p className={styles.subtitle}>Admin sign in</p>
                <LoginForm />
            </div>
        </main>
    );
}