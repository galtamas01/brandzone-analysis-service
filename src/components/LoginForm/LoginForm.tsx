"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./LoginForm.module.css";

export default function LoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password});

        if (signInError) {
            setError("Invalid email or password");
            setLoading(false);
            return;
        }

        router.refresh();
        router.push("/");
    }

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={styles.input}
                disabled={loading}
                required 
            />
            <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={styles.input}
                disabled={loading}
                required 
            />
            <button type="submit" disabled={loading} className={styles.button}>
                {loading ? "Signing in..." : "Sign in"}
            </button>
            {error && <p className={styles.error}>{error}</p>}
        </form>
    )
}