import { useEffect, useState } from "react";
import {
  fetchLibrary, createDoc, deleteDoc, patchDoc, duplicateDoc, type DocMeta,
} from "@/lib/api";
import { newStoryPayload, newPostPayload, type StoryPayload } from "@/lib/model";
import { applyFilters, availableMonths, monthLabel, EMPTY_FILTER, type FilterState } from "@/lib/filter";
import { Shell } from "@/components/Shell";

const actBtn: React.CSSProperties = {
  border: "1px solid var(--line)", background: "#fff", borderRadius: 7, cursor: "pointer",
  width: 30, height: 30, fontSize: 13, color: "var(--muted)", padding: 0,
};

export function Library({ onOpen }: { onOpen: (id: string) => void }) {
  const [docs, setDocs] = useState<DocMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);

  async function reload() {
    try {
      setDocs(await fetchLibrary());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => { reload(); }, []);

  async function create(payload: StoryPayload) {
    setBusy(true);
    setMenuOpen(false);
    try {
      const doc = await createDoc(payload);
      onOpen(doc.id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function duplicate(id: string) {
    setBusy(true);
    try { await duplicateDoc(id); await reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function rename(d: DocMeta) {
    const t = prompt("Nouveau titre :", d.title);
    if (t === null) return;
    setBusy(true);
    try { await patchDoc(d.id, { title: t.trim() || d.title }); await reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function toggleStatus(d: DocMeta) {
    setBusy(true);
    try { await patchDoc(d.id, { status: d.status === "ready" ? "draft" : "ready" }); await reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function remove(d: DocMeta) {
    if (!confirm(`Supprimer « ${d.title} » ? Cette action est définitive.`)) return;
    setBusy(true);
    try { await deleteDoc(d.id); await reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const months = docs ? availableMonths(docs) : [];
  const rows = docs ? applyFilters(docs, filter) : [];

  return (
    <Shell
      active="creations"
      title="Créations"
      actions={
        <div style={{ position: "relative" }}>
          <button type="button" className="btn primary" onClick={() => setMenuOpen((o) => !o)} disabled={busy}>+ Nouveau</button>
          {menuOpen && (
            <div style={{ position: "absolute", right: 0, top: "112%", background: "#fff", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow)", padding: 6, zIndex: 30, display: "flex", flexDirection: "column", gap: 4, minWidth: 210 }}>
              <button type="button" className="btn ghost" style={{ justifyContent: "flex-start" }} onClick={() => create(newStoryPayload())}>📱 Story (9:16)</button>
              <button type="button" className="btn ghost" style={{ justifyContent: "flex-start" }} onClick={() => create(newPostPayload("1:1"))}>🖼️ Post carré (1:1)</button>
              <button type="button" className="btn ghost" style={{ justifyContent: "flex-start" }} onClick={() => create(newPostPayload("4:5"))}>🖼️ Post portrait (4:5)</button>
            </div>
          )}
        </div>
      }
    >
      <div className="filters">
        <div className="search" style={{ maxWidth: 220 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input placeholder="Rechercher…" aria-label="Rechercher une création" value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} />
        </div>
        <select className="select" aria-label="Filtrer par type" value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value as FilterState["type"] })}>
          <option value="">Type : tous</option>
          <option value="story">Story</option>
          <option value="post">Post</option>
        </select>
        <select className="select" aria-label="Filtrer par statut" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value as FilterState["status"] })}>
          <option value="">Statut : tous</option>
          <option value="draft">Brouillon</option>
          <option value="ready">Prêt</option>
        </select>
        <select className="select" aria-label="Filtrer par période" value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })}>
          <option value="">Période : toutes</option>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <select className="select" aria-label="Trier" value={filter.sort} onChange={(e) => setFilter({ ...filter, sort: e.target.value as FilterState["sort"] })}>
          <option value="date">Tri : date ↓</option>
          <option value="title">Titre A→Z</option>
        </select>
      </div>

      {error && <p className="empty">Erreur : {error}</p>}
      {!error && docs === null && <p className="empty">Chargement…</p>}

      {docs && docs.length === 0 && (
        <div className="empty">
          Aucune création pour l'instant.
          <small>Clique sur « + Nouveau » pour créer ta première story ou ton premier post.</small>
        </div>
      )}

      {docs && docs.length > 0 && rows.length === 0 && (
        <div className="empty">Aucun résultat pour ces filtres.</div>
      )}

      {rows.length > 0 && (
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
            {rows.map((d) => (
              <tr key={d.id} onClick={() => onOpen(d.id)}>
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
                  <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" disabled={busy} style={actBtn} title="Dupliquer" onClick={() => duplicate(d.id)}>⧉</button>
                    <button type="button" disabled={busy} style={actBtn} title="Renommer" onClick={() => rename(d)}>✎</button>
                    <button type="button" disabled={busy} style={actBtn} title="Basculer brouillon/prêt" onClick={() => toggleStatus(d)}>◑</button>
                    <button type="button" disabled={busy} style={{ ...actBtn, color: "var(--terracotta-ink)" }} title="Supprimer" onClick={() => remove(d)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
