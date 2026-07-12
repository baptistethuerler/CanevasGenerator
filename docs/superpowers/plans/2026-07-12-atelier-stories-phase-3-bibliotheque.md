# Atelier de Stories — Phase 3 : Bibliothèque complète + posts · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la bibliothèque pleinement fonctionnelle (filtres actifs, actions par ligne) et permettre de créer des **posts** (carré 1:1, portrait 4:5) éditables dans l'éditeur rendu aux bonnes dimensions.

**Architecture:** On ajoute un choix de dimensions par format au moteur de rendu (`dimsFor`), un module de filtrage pur (`lib/filter.ts`), un endpoint serveur `PATCH` pour les mises à jour partielles (titre/statut), et on enrichit la bibliothèque (filtres contrôlés + actions dupliquer/renommer/statut/supprimer + menu « + Nouveau » Story/Post). L'éditeur devient conscient du format.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind + « Sérénité », Node/Express, Canvas 2D, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-07-12-atelier-stories-altitude-design.md` (§5 Formats, §6 Modèle, §7 Bibliothèque).

**Ordre :** modules purs et serveur d'abord (dims, model, patch, api, filtre), puis les écrans (bibliothèque, éditeur), enfin la vérification.

**Portée EXCLUE (phases ultérieures) :** styles configurables & marges, fonds/images/voile, logo, changement de format et inspecteur « Format » (Phase 4) · export image/carrousel/MP4 (Phase 5) · Planning, Marque, modèles, annuler/rétablir, glisser-déposer (Phase 6). Les posts utilisent le fond sauge par défaut et les styles par défaut.

---

## Structure de fichiers de cette phase

```
app/src/
├─ lib/
│  ├─ model.ts               ← (MODIFIÉ) type Format + newPostPayload
│  ├─ api.ts                 ← (MODIFIÉ) patchDoc / deleteDoc / duplicateDoc
│  ├─ filter.ts              ← (NOUVEAU) filtrage/tri purs + mois disponibles
│  └─ renderer/draw.ts       ← (MODIFIÉ) DIMS par format + dimsFor
├─ components/
│  └─ CanvasPreview.tsx      ← (MODIFIÉ) prend le format et dessine aux bonnes dimensions
├─ pages/
│  ├─ Library.tsx            ← (MODIFIÉ) filtres + actions + menu « + Nouveau »
│  └─ Editor.tsx             ← (MODIFIÉ) format-aware (dims + badge)
server/
├─ store.js                  ← (MODIFIÉ) patch(id, partial)
└─ routes/docs.js            ← (MODIFIÉ) route PATCH /doc/:id
```

---

## Task 1 : Moteur de rendu — dimensions par format

**Files:**
- Modify: `app/src/lib/renderer/draw.ts`
- Test: `app/src/lib/renderer/draw.test.ts`

- [ ] **Step 1 : Ajouter le test** (compléter le fichier existant `app/src/lib/renderer/draw.test.ts`). Ajouter en haut l'import `dimsFor, DIMS` et un nouveau bloc `describe` à la fin :

Remplacer la ligne d'import existante :
```ts
import { drawSlide, STORY_DIMS } from "./draw";
```
par :
```ts
import { drawSlide, STORY_DIMS, dimsFor, DIMS } from "./draw";
```

Puis ajouter, après le dernier `describe` du fichier :
```ts
describe("dimsFor", () => {
  it("donne les bonnes dimensions par format", () => {
    expect(dimsFor("9:16")).toEqual({ width: 1080, height: 1920, margin: 50 });
    expect(dimsFor("1:1")).toEqual({ width: 1080, height: 1080, margin: 50 });
    expect(dimsFor("4:5")).toEqual({ width: 1080, height: 1350, margin: 50 });
  });
  it("retombe sur 9:16 pour un format inconnu", () => {
    expect(dimsFor("bidon")).toEqual(DIMS["9:16"]);
  });
  it("STORY_DIMS reste l'alias du format 9:16", () => {
    expect(STORY_DIMS).toEqual(DIMS["9:16"]);
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: FAIL — `dimsFor`/`DIMS` non exportés.

- [ ] **Step 3 : Modifier `app/src/lib/renderer/draw.ts`.** Remplacer la déclaration existante de `STORY_DIMS` :

```ts
export const STORY_DIMS: Dims = { width: 1080, height: 1920, margin: 50 };
```
par :
```ts
export const DIMS: Record<string, Dims> = {
  "9:16": { width: 1080, height: 1920, margin: 50 },
  "1:1": { width: 1080, height: 1080, margin: 50 },
  "4:5": { width: 1080, height: 1350, margin: 50 },
};

export function dimsFor(format: string): Dims {
  return DIMS[format] ?? DIMS["9:16"];
}

// Alias rétro-compatible (utilisé par l'aperçu par défaut et les tests existants).
export const STORY_DIMS: Dims = DIMS["9:16"];
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: PASS (les 2 tests d'origine + 3 nouveaux).

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/renderer/draw.ts app/src/lib/renderer/draw.test.ts
git commit -m "feat(renderer): dimensions par format (9:16, 1:1, 4:5)"
```

---

## Task 2 : Modèle — format et création de post

**Files:**
- Modify: `app/src/lib/model.ts`
- Test: `app/src/lib/model.test.ts`

- [ ] **Step 1 : Ajouter le test** au fichier existant `app/src/lib/model.test.ts`. Modifier la ligne d'import :
```ts
import { DEFAULT_STYLES, newLine, newSlide, newStoryPayload, STYLE_KEYS } from "./model";
```
en :
```ts
import { DEFAULT_STYLES, newLine, newSlide, newStoryPayload, newPostPayload, STYLE_KEYS } from "./model";
```
Puis ajouter à la fin du `describe("model", ...)` :
```ts
  it("newPostPayload produit un post au format demandé", () => {
    const p = newPostPayload("1:1");
    expect(p.type).toBe("post");
    expect(p.format).toBe("1:1");
    expect(p.postMode).toBe("single");
    expect(p.slides).toHaveLength(1);
  });

  it("newPostPayload accepte le format portrait", () => {
    expect(newPostPayload("4:5").format).toBe("4:5");
  });
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: FAIL — `newPostPayload` non exporté.

- [ ] **Step 3 : Modifier `app/src/lib/model.ts`.** Remplacer le bloc `StoryPayload` + `newStoryPayload` :

```ts
export interface StoryPayload {
  type: "story";
  format: "9:16";
  title: string;
  status: "draft" | "ready";
  date: string;
  slides: Slide[];
}

export function newStoryPayload(title = "Nouvelle story"): StoryPayload {
  return {
    type: "story",
    format: "9:16",
    title,
    status: "draft",
    date: new Date().toISOString().slice(0, 10),
    slides: [newSlide()],
  };
}
```
par :
```ts
export type Format = "9:16" | "1:1" | "4:5";

export interface StoryPayload {
  type: "story" | "post";
  format: Format;
  postMode?: "single" | "carousel";
  title: string;
  status: "draft" | "ready";
  date: string;
  slides: Slide[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newStoryPayload(title = "Nouvelle story"): StoryPayload {
  return { type: "story", format: "9:16", title, status: "draft", date: today(), slides: [newSlide()] };
}

export function newPostPayload(format: Format = "1:1", title = "Nouveau post"): StoryPayload {
  return { type: "post", format, postMode: "single", title, status: "draft", date: today(), slides: [newSlide()] };
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: PASS (les 4 d'origine + 2 nouveaux).

- [ ] **Step 5 : Vérifier la compilation globale** (StoryPayload s'élargit ; le reste doit compiler)

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add app/src/lib/model.ts app/src/lib/model.test.ts
git commit -m "feat(model): type Format + newPostPayload (posts)"
```

---

## Task 3 : Serveur — mise à jour partielle (PATCH)

**Files:**
- Modify: `server/store.js`
- Modify: `server/routes/docs.js`
- Test: `server/__tests__/api.test.js`

- [ ] **Step 1 : Ajouter le test** au fichier existant `server/__tests__/api.test.js`, dans le `describe("API", ...)` :
```ts
  it("PATCH met à jour partiellement (titre + statut) sans toucher au type", async () => {
    const app = await freshApp();
    const { body } = await request(app).post("/api/doc").send({ type: "story", title: "A", slides: [] });
    const res = await request(app).patch(`/api/doc/${body.id}`).send({ title: "B", status: "ready" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("B");
    expect(res.body.status).toBe("ready");
    expect(res.body.type).toBe("story");
  });

  it("PATCH sur un id inconnu renvoie 404", async () => {
    const app = await freshApp();
    await request(app).patch("/api/doc/inconnu").send({ title: "X" }).expect(404);
  });
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run server/__tests__/api.test.js`
Expected: FAIL — la route PATCH renvoie 404 pour un id existant (méthode non gérée) ou 200 non conforme.

- [ ] **Step 3 : Ajouter `patch` au store `server/store.js`.** Dans l'objet retourné par `createStore`, ajouter cette méthode (par exemple juste avant `remove`) :
```js
    async patch(id, partial) {
      const { doc, path } = await findFile(id);
      // On ignore un éventuel changement de `type` (le fichier ne doit pas changer de dossier).
      const next = { ...doc, ...partial, id: doc.id, type: doc.type, createdAt: doc.createdAt, updatedAt: new Date().toISOString() };
      await writeFile(path, JSON.stringify(next, null, 2));
      return next;
    },
```

- [ ] **Step 4 : Ajouter la route PATCH à `server/routes/docs.js`.** Avant le `return r;` :
```js
  r.patch("/doc/:id", async (req, res) => {
    try {
      res.json(await store.patch(req.params.id, req.body));
    } catch {
      res.status(404).json({ error: "not found" });
    }
  });
```

- [ ] **Step 5 : Lancer le test (succès attendu)**

Run: `npx vitest run server/__tests__/api.test.js`
Expected: PASS.

- [ ] **Step 6 : Commit**

```bash
git add server/store.js server/routes/docs.js server/__tests__/api.test.js
git commit -m "feat(server): PATCH /doc/:id (mise à jour partielle)"
```

---

## Task 4 : Client API — patch, suppression, duplication

**Files:**
- Modify: `app/src/lib/api.ts`

- [ ] **Step 1 : Ajouter à la fin de `app/src/lib/api.ts`** (après `updateDoc`). L'import de `Format` se met avec les imports existants en tête du fichier — modifier la ligne d'import :
```ts
import type { Slide, StoryPayload } from "./model";
```
en :
```ts
import type { Slide, StoryPayload, Format } from "./model";
```
Puis ajouter à la fin :
```ts
export async function patchDoc(id: string, partial: Partial<StoryDoc>): Promise<StoryDoc> {
  const res = await fetch(`/api/doc/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  if (!res.ok) throw new Error("Mise à jour impossible");
  return res.json();
}

export async function deleteDoc(id: string): Promise<void> {
  const res = await fetch(`/api/doc/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Suppression impossible");
}

export async function duplicateDoc(id: string): Promise<StoryDoc> {
  const src = await getDoc(id);
  const payload: StoryPayload = {
    type: src.type,
    format: src.format as Format,
    postMode: src.type === "post" ? "single" : undefined,
    title: `${src.title} (copie)`,
    status: "draft",
    date: src.date ?? new Date().toISOString().slice(0, 10),
    slides: src.slides,
  };
  return createDoc(payload);
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/src/lib/api.ts
git commit -m "feat(api): patchDoc, deleteDoc, duplicateDoc"
```

---

## Task 5 : Module de filtrage (pur)

**Files:**
- Create: `app/src/lib/filter.ts`
- Test: `app/src/lib/filter.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue** `app/src/lib/filter.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { applyFilters, availableMonths, monthLabel, EMPTY_FILTER } from "./filter";
import type { DocMeta } from "./api";

const docs: DocMeta[] = [
  { id: "1", type: "story", title: "Dispos juillet", status: "ready", date: "2026-07-11", updatedAt: "2026-07-11T10:00:00Z", slideCount: 3 },
  { id: "2", type: "post", title: "Bienfaits", status: "draft", date: "2026-06-02", updatedAt: "2026-06-02T10:00:00Z", slideCount: 1 },
  { id: "3", type: "story", title: "Réserver", status: "draft", date: "2026-07-01", updatedAt: "2026-07-01T10:00:00Z", slideCount: 4 },
];

describe("applyFilters", () => {
  it("filtre par recherche (insensible à la casse)", () => {
    expect(applyFilters(docs, { ...EMPTY_FILTER, search: "dispo" }).map((d) => d.id)).toEqual(["1"]);
  });
  it("filtre par type et statut", () => {
    expect(applyFilters(docs, { ...EMPTY_FILTER, type: "story" }).map((d) => d.id).sort()).toEqual(["1", "3"]);
    expect(applyFilters(docs, { ...EMPTY_FILTER, status: "draft" }).map((d) => d.id).sort()).toEqual(["2", "3"]);
  });
  it("filtre par mois", () => {
    expect(applyFilters(docs, { ...EMPTY_FILTER, month: "2026-07" }).map((d) => d.id).sort()).toEqual(["1", "3"]);
  });
  it("trie par date décroissante par défaut", () => {
    expect(applyFilters(docs, EMPTY_FILTER).map((d) => d.id)).toEqual(["1", "3", "2"]);
  });
  it("trie par titre A→Z", () => {
    expect(applyFilters(docs, { ...EMPTY_FILTER, sort: "title" }).map((d) => d.title)).toEqual(["Bienfaits", "Dispos juillet", "Réserver"]);
  });
});

describe("availableMonths / monthLabel", () => {
  it("liste les mois présents, du plus récent au plus ancien", () => {
    expect(availableMonths(docs)).toEqual(["2026-07", "2026-06"]);
  });
  it("libelle un mois en français", () => {
    expect(monthLabel("2026-07")).toBe("Juillet 2026");
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run app/src/lib/filter.test.ts`
Expected: FAIL — `Cannot find module './filter'`.

- [ ] **Step 3 : Implémenter `app/src/lib/filter.ts`**

```ts
import type { DocMeta } from "./api";

export interface FilterState {
  search: string;
  type: "" | "story" | "post";
  status: "" | "draft" | "ready";
  month: string; // "" ou "YYYY-MM"
  sort: "date" | "title";
}

export const EMPTY_FILTER: FilterState = { search: "", type: "", status: "", month: "", sort: "date" };

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const name = MONTHS[Number(m) - 1] ?? m;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

export function availableMonths(docs: DocMeta[]): string[] {
  const set = new Set<string>();
  for (const d of docs) if (d.date) set.add(d.date.slice(0, 7));
  return [...set].sort().reverse();
}

export function applyFilters(docs: DocMeta[], f: FilterState): DocMeta[] {
  const q = f.search.trim().toLowerCase();
  const filtered = docs.filter((d) => {
    if (q && !d.title.toLowerCase().includes(q)) return false;
    if (f.type && d.type !== f.type) return false;
    if (f.status && d.status !== f.status) return false;
    if (f.month && (d.date ?? "").slice(0, 7) !== f.month) return false;
    return true;
  });
  return [...filtered].sort((a, b) => {
    if (f.sort === "title") return a.title.localeCompare(b.title, "fr");
    return (b.date ?? "").localeCompare(a.date ?? "") || b.updatedAt.localeCompare(a.updatedAt);
  });
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `npx vitest run app/src/lib/filter.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/filter.ts app/src/lib/filter.test.ts
git commit -m "feat(filter): filtrage/tri purs + mois disponibles"
```

---

## Task 6 : Bibliothèque — filtres, actions et menu « + Nouveau »

**Files:**
- Modify: `app/src/pages/Library.tsx` (remplacement complet)

- [ ] **Step 1 : Remplacer entièrement `app/src/pages/Library.tsx`** par :

```tsx
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

  async function duplicate(id: string) { setBusy(true); try { await duplicateDoc(id); await reload(); } finally { setBusy(false); } }
  async function rename(d: DocMeta) {
    const t = prompt("Nouveau titre :", d.title);
    if (t === null) return;
    setBusy(true);
    try { await patchDoc(d.id, { title: t.trim() || d.title }); await reload(); } finally { setBusy(false); }
  }
  async function toggleStatus(d: DocMeta) {
    setBusy(true);
    try { await patchDoc(d.id, { status: d.status === "ready" ? "draft" : "ready" }); await reload(); } finally { setBusy(false); }
  }
  async function remove(d: DocMeta) {
    if (!confirm(`Supprimer « ${d.title} » ? Cette action est définitive.`)) return;
    setBusy(true);
    try { await deleteDoc(d.id); await reload(); } finally { setBusy(false); }
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
                    <button type="button" style={actBtn} title="Dupliquer" onClick={() => duplicate(d.id)}>⧉</button>
                    <button type="button" style={actBtn} title="Renommer" onClick={() => rename(d)}>✎</button>
                    <button type="button" style={actBtn} title="Basculer brouillon/prêt" onClick={() => toggleStatus(d)}>◑</button>
                    <button type="button" style={{ ...actBtn, color: "var(--terracotta-ink)" }} title="Supprimer" onClick={() => remove(d)}>🗑</button>
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
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/src/pages/Library.tsx
git commit -m "feat(library): filtres actifs + actions (dupliquer/renommer/statut/supprimer) + menu Nouveau"
```

---

## Task 7 : Aperçu et éditeur conscients du format

**Files:**
- Modify: `app/src/components/CanvasPreview.tsx`
- Modify: `app/src/pages/Editor.tsx`

- [ ] **Step 1 : Remplacer entièrement `app/src/components/CanvasPreview.tsx`** par :

```tsx
import { useEffect, useRef } from "react";
import type { Slide } from "@/lib/model";
import { DEFAULT_STYLES } from "@/lib/model";
import { drawSlide, dimsFor } from "@/lib/renderer/draw";

const DEFAULT_BG = "#4e7a63"; // fond sauge par défaut (fonds/images en Phase 4)

export function CanvasPreview({ slide, format }: { slide: Slide | null; format: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dims = dimsFor(format);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      if (slide) {
        drawSlide(ctx, slide, DEFAULT_STYLES, { dims, background: DEFAULT_BG });
      } else {
        ctx.clearRect(0, 0, dims.width, dims.height);
      }
    });
    return () => { cancelled = true; };
  }, [slide, dims.width, dims.height, dims.margin]);

  return (
    <canvas
      ref={ref}
      width={dims.width}
      height={dims.height}
      style={{ height: "min(72vh, 720px)", width: "auto", borderRadius: 16, boxShadow: "var(--shadow)", display: "block" }}
    />
  );
}
```

- [ ] **Step 2 : Adapter `app/src/pages/Editor.tsx`.** Deux modifications :

(a) Remplacer la ligne du badge de format :
```tsx
          <span className="badge draft">📱 Story 1080×1920</span>
```
par :
```tsx
          <span className="badge draft">{formatLabel(doc.type, doc.format)}</span>
```

(b) Remplacer le montage de l'aperçu :
```tsx
            <CanvasPreview slide={slide} />
```
par :
```tsx
            <CanvasPreview slide={slide} format={doc.format} />
```

(c) Ajouter, juste avant `export function Editor(` en haut du fichier, la fonction utilitaire :
```tsx
function formatLabel(type: string, format: string): string {
  if (type === "post") return format === "4:5" ? "🖼️ Post 1080×1350" : "🖼️ Post 1080×1080";
  return "📱 Story 1080×1920";
}
```

- [ ] **Step 3 : Build complet (tsc + vite)**

Run: `npm run build`
Expected: succès, aucune erreur TypeScript.

- [ ] **Step 4 : Commit**

```bash
git add app/src/components/CanvasPreview.tsx app/src/pages/Editor.tsx
git commit -m "feat(editor): aperçu et badge conscients du format (story/post)"
```

---

## Task 8 : Vérification end-to-end

- [ ] **Step 1 : Suite de tests**

Run: `npm test`
Expected: tous PASS — serveur (paths 2, store 3, api 6 = 11) + app (model 6, layout 4, draw 5, filter 7 = 22). Total 33.

- [ ] **Step 2 : Vérification navigateur (parcours réel)**

```bash
npm run build
NODE_ENV=production PORT=4321 node server/index.js &
SERVER_PID=$!
sleep 1
```

Sur `http://localhost:4321` (navigateur ou Puppeteer) :
1. **« + Nouveau » → 🖼️ Post carré (1:1)** → l'éditeur s'ouvre, l'aperçu est **carré** (badge « Post 1080×1080 »). Éditer une ligne, revenir.
2. **« + Nouveau » → 📱 Story** → aperçu vertical 9:16. Revenir.
3. Dans le listing (2 créations) : tester **Renommer** (✎), **Basculer statut** (◑ → badge « Prêt »), **Dupliquer** (⧉ → « … (copie) » apparaît), **Supprimer** (🗑 avec confirmation).
4. Tester les **filtres** : recherche par titre, Type = Post (seuls les posts restent), Statut = Prêt, Période = le mois courant, Tri = Titre A→Z. Vérifier que « Aucun résultat » s'affiche pour un filtre vide.
5. Le clic sur une ligne ouvre l'éditeur ; le clic sur un bouton d'action **n'ouvre pas** l'éditeur.

Contrôle disque :
```bash
ls data/stories/ data/posts/
kill $SERVER_PID
```
Expected: le post est bien rangé dans `data/posts/`, les stories dans `data/stories/`.

- [ ] **Step 3 : Commit** (uniquement si des correctifs ont été nécessaires).

---

## Definition of Done (Phase 3)

- Filtres de bibliothèque **actifs** : recherche, type, statut, période (mois), tri — logique pure testée.
- Actions par ligne : **dupliquer, renommer, basculer statut, supprimer** (avec confirmation), listing rafraîchi.
- **« + Nouveau »** propose Story / Post carré / Post portrait ; la création ouvre l'éditeur.
- Éditeur **conscient du format** : aperçu aux bonnes dimensions (9:16 / 1:1 / 4:5) et badge correct ; posts rangés dans `data/posts/`.
- Endpoint serveur **PATCH** pour mises à jour partielles (titre/statut), testé.
- `npm test` vert (33 tests), `npm run build` vert.
- Base prête pour la **Phase 4 (inspecteur complet : styles, fonds, logo, format)**.
```
