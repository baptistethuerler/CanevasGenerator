import { useEffect, useState } from "react";
import { fetchLibrary, type DocMeta } from "@/lib/api";

export function Library() {
  const [docs, setDocs] = useState<DocMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLibrary().then(setDocs).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 px-6 py-3 bg-white border-b border-black/10">
        <div className="w-7 h-7 rounded-lg bg-sage grid place-items-center text-white">🌿</div>
        <b>Atelier Altitude</b>
      </header>
      <main className="p-6">
        {error && <p className="text-red-600">{error}</p>}
        {!error && docs === null && <p className="text-muted">Chargement…</p>}
        {docs && docs.length === 0 && (
          <div className="text-center text-muted py-20">
            <p className="text-lg">Aucune création pour l'instant.</p>
            <p className="text-sm mt-2">Le bouton « + Nouveau » arrivera en Phase 3.</p>
          </div>
        )}
        {docs && docs.length > 0 && (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="px-4 py-2 bg-white rounded-lg border border-black/10">
                {d.title} — {d.type} — {d.slideCount} slides
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
