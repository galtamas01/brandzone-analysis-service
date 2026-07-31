import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import styles from "./page.module.css"
import CreateClientForm from "@/components/CreateClientForm/CreateClientForm";

export const dynamic = "force-dynamic"

type Client = { id: string, name: string, created_at: string };

export default async function ClientsPage() {
  const { data: clients, error } = await supabaseAdmin
    .from("client")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>BrandZone Clients</h1>

      <CreateClientForm />

      {error && (
          <div className={styles.error}>
            Failed to load clients: {error.message}
          </div>
      )}

      {clients && clients.length === 0 && (
        <p className={styles.empty}>No client found. Add your first client!</p>
      )}

      <ul className={styles.list}>
        {clients?.map((client: Client) => (
            <li key={client.id}>
                <Link href={`/clients/${client.id}`} className={styles.clientRow}>
                    <span className={styles.clientName}>{client.name}</span>
                    <span className={styles.arrow}>→</span>
                </Link>
            </li>
        ))}
      </ul>
    </main>
  );
}