"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./LogoutButton.module.css"

export default function LogoutButton() {
    const router = useRouter();

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    }

    return (
        <button onClick={handleLogout} className={styles.button}>
            Sign out
        </button>
    );
}