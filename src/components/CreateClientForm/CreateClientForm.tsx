"use client"

import styles from "./CreateClientForm.module.css"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function CreateClientForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const trimmed = name.trim();
        if (!trimmed) {
            setError("Name is a required field.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmed }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? "Unknown error");
                return;
            }

            setName("");
            router.refresh();
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.wrapper}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="New client's name"
                    className={styles.input}
                    disabled={loading}
                />
                <button type="submit" disabled={loading} className={styles.button}>
                    {loading ? "Saving..." : "Add client"}
                </button>
            </form>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}