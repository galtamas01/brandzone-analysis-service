'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClients() {
      // Lekérdezzük az összes rekordot a 'client' táblából
      const { data, error } = await supabase.from('client').select('*');

      if (error) {
        console.error('Hiba az adatok lekérdezésekor:', error);
        setErrorMsg(error.message);
      } else {
        setClients(data || []);
      }
      setLoading(false);
    }

    fetchClients();
  }, []);

  return (
    <main className="p-8 max-w-2xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4 text-blue-600">
        BrandZone Analytics — Adatbázis Kapcsolat Teszt
      </h1>

      {loading && <p className="text-gray-500">Adatok betöltése a Supabase-ből...</p>}

      {errorMsg && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md mb-4">
          <strong>Hiba történt:</strong> {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-lg font-semibold mb-3">Ügyfelek az adatbázisban:</h2>
          {clients.length === 0 ? (
            <p className="text-gray-500">Még nincs egyetlen ügyfél sem az adatbázisban.</p>
          ) : (
            <ul className="space-y-2">
              {clients.map((client) => (
                <li key={client.id} className="p-3 bg-gray-50 rounded border flex justify-between items-center">
                  <span className="font-medium text-gray-800">{client.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{client.id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}