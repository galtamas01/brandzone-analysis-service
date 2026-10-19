"use client"

import { useState } from "react"
import 'material-symbols/outlined.css';
import styles from "./GenerateReportForm.module.css"
import { type ReportLocale, DEFAULT_REPORT_LOCALE } from "@/lib/i18n/reportLocale";

function toInputDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

type Props = {
    clientId: string;
}

export default function GenerateReportForm({ clientId }: Props) {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 30);

    const [start, setStart] = useState(toInputDate(monthAgo));
    const [end, setEnd] = useState(toInputDate(today));
    const [lang, setLang] = useState<ReportLocale>(DEFAULT_REPORT_LOCALE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleGenerate() {
        setError(null);

        if(!start || !end) {
            setError("Please select both a start and an end date");
            return;
        }
        if (start > end) {
            setError("The start date must be on or before the end date");
            return;
        }

        setLoading(true);
        try {
            const url = `/api/reports?client_id=${clientId}&start=${start}&end=${end}&lang=${lang}`;
            const res = await fetch(url);

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? "Failed to generate report");
                return;
            }

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);

            const disposition = res.headers.get("Content-Disposition") ?? "";
            const match = disposition.match(/filename="(.+?)"/);
            const fileName = match?.[1] ?? `report_${start}_${end}_${lang}.pdf`;

            const a = document.createElement("a");
            a.href = objectUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objectUrl);
        } catch {
            setError("Network error while generating report. Try again!");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.fields}>
                <label className={styles.field}>
                    <span className={styles.label}>Start date</span>
                    <input
                        type="date"
                        value={start}
                        max={end}
                        onChange={(e) => setStart(e.target.value)}
                        className={styles.input}
                        disabled={loading}
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.label}>End date</span>
                    <input
                        type="date"
                        value={end}
                        min={start}
                        onChange={(e) => setEnd(e.target.value)}
                        className={styles.input}
                        disabled={loading}
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.label}>Language</span>
                    <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value as ReportLocale)}
                        className={styles.select}
                        disabled={loading}
                    >
                        <option value="hu">HU</option>
                        <option value="ro">RO</option>
                        <option value="en">EN</option>
                    </select>
                </label>
                <button onClick={handleGenerate} disabled={loading} className={styles.button}>
                    <span className="material-symbols-outlined">download</span>
                    {loading ? "Generating..." : "Generate report"}
                </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    )
}