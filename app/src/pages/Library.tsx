import { useEffect, useState } from "react";
import { fetchLibrary, type DocMeta } from "@/lib/api";
import { Shell } from "@/components/Shell";

export function Library() {
  const [docs, setDocs] = useState<DocMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLibrary().then(setDocs).catch((e) => setError(e.message));
  }, []);

  return (
    <Shell
      active="creations"
      title="Créations"
      actions={
        <button type="button" className="btn primary" disabled>
          + Nouveau
        </button>
      }
    >
      {/* Barre de filtres sur une seule ligne (câblée en Phase 3) */}
      <div className="filters">
        <div className="search" style={{ maxWidth: 220 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input placeholder="Rechercher…" aria-label="Rechercher une création" />
        </div>
        <select className="select" aria-label="Filtrer par type" defaultValue="">
          <option value="">Type : tous</option>
          <option>Story</option>
          <option>Post</option>
        </select>
        <select className="select" aria-label="Filtrer par statut" defaultValue="">
          <option value="">Statut : tous</option>
          <option>Brouillon</option>
          <option>Prêt</option>
        </select>
        <select className="select" aria-label="Filtrer par période" defaultValue="">
          <option value="">Période : toutes</option>
        </select>
        <select className="select" aria-label="Trier" defaultValue="date">
          <option value="date">Tri : date ↓</option>
          <option value="title">Titre A→Z</option>
        </select>
      </div>

      {error && <p className="empty">Erreur : {error}</p>}
      {!error && docs === null && <p className="empty">Chargement…</p>}

      {docs && docs.length === 0 && (
        <div className="empty">
          Aucune création pour l'instant.
          <small>La création de stories et de posts arrivera dans les prochaines phases.</small>
        </div>
      )}

      {docs && docs.length > 0 && (
        <table className="listing">
          <thead>
            <tr>
              <th></th>
              <th>Titre</th>
              <th>Type</th>
              <th>Date</th>
              <th>Statut</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>
                  <div className={`thumb${d.type === "post" ? " square" : ""}`} />
                </td>
                <td>
                  <b>{d.title}</b>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{d.slideCount} slides</div>
                </td>
                <td>{d.type === "post" ? "🖼️ Post" : "📱 Story"}</td>
                <td>{d.date ?? "—"}</td>
                <td>
                  <span className={`badge ${d.status === "ready" ? "ready" : "draft"}`}>
                    {d.status === "ready" ? "✓ Prêt" : "● Brouillon"}
                  </span>
                </td>
                <td>
                  <div className="row-actions">⧉ ⤓ ⋯</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
