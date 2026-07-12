# Atelier de Stories — Phase 2 : Moteur de rendu + éditeur de base · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de créer, éditer et sauvegarder une **story** (slides + lignes de texte) depuis l'éditeur, avec un **aperçu canvas statique en direct** rendu par un moteur unique.

**Architecture:** Un moteur de rendu canvas pur (modules `model` → `renderer/layout` → `renderer/draw`), sans dépendance à React, réutilisable plus tard pour l'export. L'éditeur React (3 colonnes : slides · aperçu · inspecteur « Contenu ») lit/écrit la story via l'API de la Phase 1 (sauvegarde automatique). Navigation bibliothèque ↔ éditeur par un routeur d'état minimal dans `App` (aucune dépendance ajoutée).

**Tech Stack:** React 18, TypeScript, Vite, Tailwind + design system « Sérénité », Canvas 2D, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-07-12-atelier-stories-altitude-design.md` (§5 Formats, §6 Modèle, §8 Éditeur, §9 Contenu, §10 Rendu).

**Ordre d'exécution :** on construit d'abord les modules purs (model, layout, draw), le client API et les composants React isolés, puis l'éditeur, et **enfin** le câblage `App` + `Library` (fusionné) pour ne jamais laisser le projet dans un état qui ne compile pas.

**Portée EXCLUE de la Phase 2 (phases ultérieures) :** animation « Lire » et export (Phase 5) · fonds/images/voile/logo/format (Phase 4) · styles configurables & marges (Phase 4) · glisser-déposer, annuler/rétablir (Phase 6) · posts & carrousel (phase dédiée). Phase 2 : fond **sauge uni** par défaut, **styles par défaut** figés, réordonnancement par boutons **↑/↓**.

---

## Structure de fichiers de cette phase

```
app/src/
├─ lib/
│  ├─ model.ts               ← types Story/Slide/Line, styles par défaut, fabriques
│  ├─ api.ts                 ← (MODIFIÉ) createDoc / getDoc / updateDoc
│  └─ renderer/
│     ├─ layout.ts           ← mise en page pure (wrap + positions), testable
│     └─ draw.ts             ← dessin canvas (fond + texte) via layout, testable
├─ components/
│  ├─ CanvasPreview.tsx      ← <canvas> qui rend le slide actif en direct
│  ├─ SlidesRail.tsx         ← colonne gauche : vignettes + actions slides
│  └─ ContentInspector.tsx   ← onglet « Contenu » : édition des lignes
├─ pages/
│  ├─ Library.tsx            ← (MODIFIÉ, tâche finale) « + Nouveau » + clic → éditeur
│  └─ Editor.tsx             ← page éditeur 3 colonnes + sauvegarde auto
└─ App.tsx                   ← (MODIFIÉ, tâche finale) routeur d'état library ↔ editor
vitest.config.ts             ← (MODIFIÉ) inclut aussi les tests app/src
```

---

## Task 1 : Modèle de données et styles par défaut

**Files:**
- Create: `app/src/lib/model.ts`
- Test: `app/src/lib/model.test.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1 : Élargir Vitest aux tests de `app/src`.** Remplacer le contenu de `vitest.config.ts` par :

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.js", "app/src/**/*.test.{ts,tsx}"],
  },
});
```

- [ ] **Step 2 : Écrire le test qui échoue** `app/src/lib/model.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_STYLES, newLine, newSlide, newStoryPayload, STYLE_KEYS } from "./model";

describe("model", () => {
  it("expose les 6 styles par défaut avec une taille et une couleur", () => {
    expect(STYLE_KEYS).toEqual(["title", "subtitle", "text", "bullet", "arrow", "note"]);
    for (const k of STYLE_KEYS) {
      expect(DEFAULT_STYLES[k].size).toBeGreaterThan(0);
      expect(typeof DEFAULT_STYLES[k].color).toBe("string");
    }
  });

  it("newLine crée une ligne avec id, style et texte vide", () => {
    const l = newLine("subtitle");
    expect(l.id).toBeTruthy();
    expect(l.style).toBe("subtitle");
    expect(l.text).toBe("");
  });

  it("newSlide crée un slide avec au moins une ligne", () => {
    const s = newSlide();
    expect(s.id).toBeTruthy();
    expect(s.lines.length).toBeGreaterThan(0);
  });

  it("newStoryPayload produit une story format 9:16 avec un slide", () => {
    const p = newStoryPayload("Ma story");
    expect(p.type).toBe("story");
    expect(p.format).toBe("9:16");
    expect(p.title).toBe("Ma story");
    expect(p.status).toBe("draft");
    expect(p.slides).toHaveLength(1);
    expect(typeof p.date).toBe("string");
  });
});
```

- [ ] **Step 3 : Lancer le test (échec attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: FAIL — `Cannot find module './model'`.

- [ ] **Step 4 : Implémenter `app/src/lib/model.ts`**

```ts
export type LineStyleKey = "title" | "subtitle" | "text" | "bullet" | "arrow" | "note";

export const STYLE_KEYS: LineStyleKey[] = ["title", "subtitle", "text", "bullet", "arrow", "note"];

export interface StyleDef {
  label: string;
  font: string;
  size: number;
  color: string;
  lineHeight: number;
  gapTop: number;
  mark: string | null;
  indent: number;
}

export const DEFAULT_FONT = "Nunito";

export const DEFAULT_STYLES: Record<LineStyleKey, StyleDef> = {
  title: { label: "Titre", font: DEFAULT_FONT, size: 78, color: "#ffffff", lineHeight: 1.12, gapTop: 0, mark: null, indent: 0 },
  subtitle: { label: "Sous-titre", font: DEFAULT_FONT, size: 48, color: "#ffffff", lineHeight: 1.2, gapTop: 52, mark: null, indent: 0 },
  text: { label: "Texte", font: DEFAULT_FONT, size: 39, color: "rgba(255,255,255,.95)", lineHeight: 1.32, gapTop: 24, mark: null, indent: 0 },
  bullet: { label: "Puce", font: DEFAULT_FONT, size: 38, color: "rgba(255,255,255,.95)", lineHeight: 1.3, gapTop: 14, mark: "•", indent: 44 },
  arrow: { label: "Créneau", font: DEFAULT_FONT, size: 42, color: "#eaf5f2", lineHeight: 1.24, gapTop: 10, mark: "→", indent: 44 },
  note: { label: "Note", font: DEFAULT_FONT, size: 31, color: "rgba(255,255,255,.82)", lineHeight: 1.36, gapTop: 40, mark: null, indent: 0 },
};

export interface Line {
  id: string;
  style: LineStyleKey;
  text: string;
}

export interface Slide {
  id: string;
  name?: string;
  lines: Line[];
}

export interface StoryPayload {
  type: "story";
  format: "9:16";
  title: string;
  status: "draft" | "ready";
  date: string;
  slides: Slide[];
}

export function uid(): string {
  return crypto.randomUUID();
}

export function newLine(style: LineStyleKey = "text"): Line {
  return { id: uid(), style, text: "" };
}

export function newSlide(): Slide {
  return { id: uid(), lines: [{ ...newLine("title"), text: "Nouveau slide" }, newLine("text")] };
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

- [ ] **Step 5 : Lancer le test (succès attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6 : Commit**

```bash
git add app/src/lib/model.ts app/src/lib/model.test.ts vitest.config.ts
git commit -m "feat(model): types story/slide/line + styles par défaut"
```

---

## Task 2 : Moteur de rendu — mise en page (pure)

**Files:**
- Create: `app/src/lib/renderer/layout.ts`
- Test: `app/src/lib/renderer/layout.test.ts`

La mise en page est **pure** : elle reçoit une fonction `measure(text, font) => largeur` injectée, donc testable sans canvas.

- [ ] **Step 1 : Écrire le test qui échoue** `app/src/lib/renderer/layout.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { layoutSlide, wrapText, fontString } from "./layout";
import { DEFAULT_STYLES } from "../model";

const measure = (t: string) => t.length * 10; // mesure factice : 10px / caractère

describe("wrapText", () => {
  it("coupe le texte pour tenir dans la largeur", () => {
    const lines = wrapText("aaa bbb ccc", 60, measure); // 60px = 6 caractères
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toBe("aaa");
  });
  it("renvoie une ligne vide pour un texte vide", () => {
    expect(wrapText("", 100, measure)).toEqual([""]);
  });
});

describe("fontString", () => {
  it("compose taille + police", () => {
    expect(fontString(DEFAULT_STYLES.title)).toContain("78px");
    expect(fontString(DEFAULT_STYLES.title)).toContain("Nunito");
  });
});

describe("layoutSlide", () => {
  it("produit un bloc par ligne avec une hauteur > 0", () => {
    const lines = [
      { id: "1", style: "title" as const, text: "Titre" },
      { id: "2", style: "text" as const, text: "Un texte" },
    ];
    const layout = layoutSlide(lines, DEFAULT_STYLES, { contentWidth: 980, measure: (t) => t.length * 10 });
    expect(layout.blocks).toHaveLength(2);
    expect(layout.totalHeight).toBeGreaterThan(0);
    expect(layout.blocks[0].gap).toBe(0);
    expect(layout.blocks[1].gap).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run app/src/lib/renderer/layout.test.ts`
Expected: FAIL — `Cannot find module './layout'`.

- [ ] **Step 3 : Implémenter `app/src/lib/renderer/layout.ts`**

```ts
import type { Line, LineStyleKey, StyleDef } from "../model";

export type Measure = (text: string, font: string) => number;

export function fontString(st: StyleDef): string {
  return `600 ${st.size}px ${st.font}, Georgia, serif`;
}

export function wrapText(text: string, maxWidth: number, measure: (t: string) => number): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? cur + " " + w : w;
    if (measure(candidate) > maxWidth && cur) {
      out.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

export interface LayoutBlock {
  line: Line;
  style: StyleDef;
  font: string;
  wrapped: string[];
  lineHeight: number;
  indent: number;
  markWidth: number;
  height: number;
  gap: number;
}

export interface SlideLayout {
  blocks: LayoutBlock[];
  totalHeight: number;
}

export function layoutSlide(
  lines: Line[],
  styles: Record<LineStyleKey, StyleDef>,
  opts: { contentWidth: number; measure: Measure },
): SlideLayout {
  const { contentWidth, measure } = opts;
  const blocks: LayoutBlock[] = [];
  let total = 0;
  lines.forEach((ln, i) => {
    const st = styles[ln.style] ?? styles.text;
    const font = fontString(st);
    const markWidth = st.mark ? measure(st.mark + "  ", font) : 0;
    const avail = contentWidth - st.indent - markWidth;
    const wrapped = wrapText(ln.text, avail, (t) => measure(t, font));
    const lineHeight = st.size * st.lineHeight;
    const height = wrapped.length * lineHeight;
    const gap = i === 0 ? 0 : st.gapTop;
    blocks.push({ line: ln, style: st, font, wrapped, lineHeight, indent: st.indent, markWidth, height, gap });
    total += gap + height;
  });
  return { blocks, totalHeight: total };
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `npx vitest run app/src/lib/renderer/layout.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/renderer/layout.ts app/src/lib/renderer/layout.test.ts
git commit -m "feat(renderer): mise en page pure (wrap + blocs)"
```

---

## Task 3 : Moteur de rendu — dessin canvas

**Files:**
- Create: `app/src/lib/renderer/draw.ts`
- Test: `app/src/lib/renderer/draw.test.ts`

Le dessin est testé avec un **contexte factice** qui enregistre les appels.

- [ ] **Step 1 : Écrire le test qui échoue** `app/src/lib/renderer/draw.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { drawSlide, STORY_DIMS } from "./draw";
import { DEFAULT_STYLES } from "../model";

function fakeCtx() {
  const calls: any[][] = [];
  return {
    font: "", fillStyle: "", textBaseline: "", textAlign: "",
    clearRect: (...a: any[]) => calls.push(["clearRect", ...a]),
    fillRect: (...a: any[]) => calls.push(["fillRect", ...a]),
    fillText: (...a: any[]) => calls.push(["fillText", ...a]),
    measureText: (t: string) => ({ width: String(t).length * 20 }),
    calls,
  };
}

describe("drawSlide", () => {
  it("peint le fond puis le texte", () => {
    const ctx = fakeCtx();
    const slide = { id: "s", lines: [{ id: "1", style: "title" as const, text: "Bonjour" }] };
    drawSlide(ctx as any, slide, DEFAULT_STYLES, { dims: STORY_DIMS, background: "#4e7a63" });
    const kinds = ctx.calls.map((c) => c[0]);
    expect(kinds).toContain("fillRect");
    expect(kinds).toContain("fillText");
    expect(ctx.calls.some((c) => c[0] === "fillText" && c[1] === "Bonjour")).toBe(true);
  });

  it("STORY_DIMS = 1080x1920, marge 50", () => {
    expect(STORY_DIMS.width).toBe(1080);
    expect(STORY_DIMS.height).toBe(1920);
    expect(STORY_DIMS.margin).toBe(50);
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: FAIL — `Cannot find module './draw'`.

- [ ] **Step 3 : Implémenter `app/src/lib/renderer/draw.ts`**

```ts
import type { Slide, LineStyleKey, StyleDef } from "../model";
import { layoutSlide } from "./layout";

export interface Dims {
  width: number;
  height: number;
  margin: number;
}

export const STORY_DIMS: Dims = { width: 1080, height: 1920, margin: 50 };

export interface DrawCtx {
  font: string;
  fillStyle: string | CanvasGradient | CanvasPattern;
  textBaseline: string;
  textAlign: string;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
}

export function drawSlide(
  ctx: DrawCtx,
  slide: Slide,
  styles: Record<LineStyleKey, StyleDef>,
  opts: { dims: Dims; background: string },
): void {
  const { width, height, margin } = opts.dims;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, width, height);

  const contentWidth = width - 2 * margin;
  const layout = layoutSlide(slide.lines, styles, {
    contentWidth,
    measure: (t, f) => {
      ctx.font = f;
      return ctx.measureText(t).width;
    },
  });

  const bandTop = margin;
  const bandBottom = height - margin;
  let y = bandTop + Math.max(0, (bandBottom - bandTop - layout.totalHeight) / 2);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  for (const b of layout.blocks) {
    y += b.gap;
    ctx.font = b.font;
    const firstBaseline = y + b.style.size * 0.8;
    const markX = margin + b.indent;
    const textX = markX + b.markWidth;

    if (b.style.mark) {
      ctx.fillStyle = b.style.color;
      ctx.fillText(b.style.mark, markX, firstBaseline);
    }

    ctx.fillStyle = b.style.color;
    b.wrapped.forEach((tline, k) => {
      ctx.fillText(tline, textX, firstBaseline + k * b.lineHeight);
    });

    y += b.height;
  }
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/renderer/draw.ts app/src/lib/renderer/draw.test.ts
git commit -m "feat(renderer): dessin canvas (fond + texte) via layout"
```

---

## Task 4 : Client API — documents complets

**Files:**
- Modify: `app/src/lib/api.ts`

- [ ] **Step 1 : Ajouter à la fin de `app/src/lib/api.ts`** (garder l'existant `DocMeta` / `fetchLibrary`) :

```ts
import type { Slide, StoryPayload } from "./model";

export interface StoryDoc {
  id: string;
  type: "story" | "post";
  format: string;
  title: string;
  status: "draft" | "ready";
  date?: string;
  createdAt: string;
  updatedAt: string;
  slides: Slide[];
}

export async function createDoc(payload: StoryPayload): Promise<StoryDoc> {
  const res = await fetch("/api/doc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Création impossible");
  return res.json();
}

export async function getDoc(id: string): Promise<StoryDoc> {
  const res = await fetch(`/api/doc/${id}`);
  if (!res.ok) throw new Error("Document introuvable");
  return res.json();
}

export async function updateDoc(id: string, doc: StoryDoc): Promise<StoryDoc> {
  const res = await fetch(`/api/doc/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error("Enregistrement impossible");
  return res.json();
}
```

- [ ] **Step 2 : Vérifier la compilation** (App/Library encore inchangés à ce stade → doit passer)

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/src/lib/api.ts
git commit -m "feat(api): client createDoc/getDoc/updateDoc"
```

---

## Task 5 : Aperçu canvas en direct

**Files:**
- Create: `app/src/components/CanvasPreview.tsx`

- [ ] **Step 1 : Implémenter `app/src/components/CanvasPreview.tsx`**

```tsx
import { useEffect, useRef } from "react";
import type { Slide } from "@/lib/model";
import { DEFAULT_STYLES } from "@/lib/model";
import { drawSlide, STORY_DIMS } from "@/lib/renderer/draw";

const DEFAULT_BG = "#4e7a63"; // fond sauge par défaut (fonds/images en Phase 4)

export function CanvasPreview({ slide }: { slide: Slide | null }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      if (slide) {
        drawSlide(ctx, slide, DEFAULT_STYLES, { dims: STORY_DIMS, background: DEFAULT_BG });
      } else {
        ctx.clearRect(0, 0, STORY_DIMS.width, STORY_DIMS.height);
      }
    });
    return () => { cancelled = true; };
  }, [slide]);

  return (
    <canvas
      ref={ref}
      width={STORY_DIMS.width}
      height={STORY_DIMS.height}
      style={{ height: "min(72vh, 720px)", width: "auto", borderRadius: 16, boxShadow: "var(--shadow)", display: "block" }}
    />
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/src/components/CanvasPreview.tsx
git commit -m "feat(preview): aperçu canvas du slide actif"
```

---

## Task 6 : Colonne des slides

**Files:**
- Create: `app/src/components/SlidesRail.tsx`

- [ ] **Step 1 : Implémenter `app/src/components/SlidesRail.tsx`**

```tsx
import type { CSSProperties } from "react";
import type { Slide } from "@/lib/model";

const miniBtn: CSSProperties = {
  border: "1px solid var(--line)", background: "#fff", borderRadius: 6, cursor: "pointer",
  width: 22, height: 22, fontSize: 12, lineHeight: 1, color: "var(--muted)", padding: 0,
};

export function SlidesRail({
  slides, activeIndex, onSelect, onAdd, onDuplicate, onDelete, onMove,
}: {
  slides: Slide[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
}) {
  return (
    <div style={{ width: 132, borderRight: "1px solid var(--line)", background: "#fbfdfc", padding: 10, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800 }}>Slides</div>
      {slides.map((s, i) => (
        <div key={s.id} style={{ border: `2px solid ${i === activeIndex ? "var(--sage)" : "var(--line)"}`, borderRadius: 8, padding: 6, background: i === activeIndex ? "#f3f8f4" : "#fff", cursor: "pointer" }} onClick={() => onSelect(i)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 800, color: "var(--ink)" }}>
            <span>{i + 1}</span>
            <span style={{ display: "flex", gap: 2 }}>
              <button type="button" title="Monter" onClick={(e) => { e.stopPropagation(); onMove(i, -1); }} style={miniBtn}>↑</button>
              <button type="button" title="Descendre" onClick={(e) => { e.stopPropagation(); onMove(i, 1); }} style={miniBtn}>↓</button>
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.lines.find((l) => l.text)?.text || "—"}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(i); }} style={miniBtn} title="Dupliquer">⧉</button>
            {slides.length > 1 && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(i); }} style={{ ...miniBtn, color: "var(--terracotta-ink)" }} title="Supprimer">✕</button>
            )}
          </div>
        </div>
      ))}
      <button type="button" className="btn ghost" onClick={onAdd} style={{ fontSize: 13, padding: "8px 6px" }}>+ Slide</button>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/src/components/SlidesRail.tsx
git commit -m "feat(editor): colonne des slides (ajout/dupliquer/supprimer/↑↓)"
```

---

## Task 7 : Inspecteur « Contenu »

**Files:**
- Create: `app/src/components/ContentInspector.tsx`

- [ ] **Step 1 : Implémenter `app/src/components/ContentInspector.tsx`**

```tsx
import type { CSSProperties } from "react";
import type { Line, LineStyleKey } from "@/lib/model";
import { DEFAULT_STYLES, STYLE_KEYS } from "@/lib/model";

const inspBtn: CSSProperties = {
  border: "1px solid var(--line)", background: "#fff", borderRadius: 6, cursor: "pointer",
  width: 26, height: 26, fontSize: 12, color: "var(--muted)", padding: 0,
};

export function ContentInspector({
  lines, onChangeText, onChangeStyle, onAdd, onDelete, onMove,
}: {
  lines: Line[];
  onChangeText: (id: string, text: string) => void;
  onChangeStyle: (id: string, style: LineStyleKey) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  return (
    <div style={{ width: 260, borderLeft: "1px solid var(--line)", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ padding: "12px 12px 6px", fontWeight: 800, color: "var(--sage-deep)", fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px" }}>Contenu</div>
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {lines.map((ln) => (
          <div key={ln.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 8, background: "#fbfdfc", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select className="select" style={{ flex: 1, padding: "5px 6px", fontSize: 12 }} value={ln.style} onChange={(e) => onChangeStyle(ln.id, e.target.value as LineStyleKey)}>
                {STYLE_KEYS.map((k) => (
                  <option key={k} value={k}>{DEFAULT_STYLES[k].label}</option>
                ))}
              </select>
              <button type="button" onClick={() => onMove(ln.id, -1)} style={inspBtn} title="Monter">↑</button>
              <button type="button" onClick={() => onMove(ln.id, 1)} style={inspBtn} title="Descendre">↓</button>
              <button type="button" onClick={() => onDelete(ln.id)} style={{ ...inspBtn, color: "var(--terracotta-ink)" }} title="Supprimer">✕</button>
            </div>
            <input
              className="input"
              style={{ padding: "8px 10px", fontSize: 13 }}
              value={ln.text}
              placeholder="Texte de la ligne…"
              onChange={(e) => onChangeText(ln.id, e.target.value)}
            />
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={onAdd} style={{ fontSize: 13 }}>+ Ajouter une ligne</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/src/components/ContentInspector.tsx
git commit -m "feat(editor): inspecteur Contenu (édition des lignes)"
```

---

## Task 8 : Page éditeur + sauvegarde automatique

**Files:**
- Create: `app/src/pages/Editor.tsx`

Assemble slides + aperçu + inspecteur, gère l'état de la story et la **sauvegarde automatique** (débattue à 600 ms) avec indicateur « ✓ Enregistré ». À ce stade, rien n'importe encore `Editor` (App inchangé), donc le projet compile.

- [ ] **Step 1 : Implémenter `app/src/pages/Editor.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { getDoc, updateDoc, type StoryDoc } from "@/lib/api";
import { newSlide, newLine, uid, type LineStyleKey } from "@/lib/model";
import { CanvasPreview } from "@/components/CanvasPreview";
import { SlidesRail } from "@/components/SlidesRail";
import { ContentInspector } from "@/components/ContentInspector";

export function Editor({ id, onBack }: { id: string; onBack: () => void }) {
  const [doc, setDoc] = useState<StoryDoc | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    getDoc(id).then(setDoc).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!doc) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateDoc(id, doc)
        .then(() => { setSaved(true); setTimeout(() => setSaved(false), 1200); })
        .catch((e) => setError((e as Error).message));
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [doc, id]);

  if (error) return <div className="empty" style={{ padding: 40 }}>Erreur : {error} <button className="btn ghost" onClick={onBack}>← Retour</button></div>;
  if (!doc) return <div className="empty" style={{ padding: 40 }}>Chargement…</div>;

  const slides = doc.slides;
  const idx = Math.min(active, slides.length - 1);
  const slide = slides[idx] ?? null;

  const setSlides = (next: typeof slides) => setDoc({ ...doc, slides: next });
  const updateSlide = (i: number, fn: (s: typeof slides[number]) => typeof slides[number]) =>
    setSlides(slides.map((s, j) => (j === i ? fn(s) : s)));

  return (
    <div className="app" style={{ gridTemplateColumns: "1fr" }}>
      <div className="content">
        <header className="topbar">
          <button className="btn ghost" onClick={onBack}>←</button>
          <input
            className="input"
            style={{ maxWidth: 260, fontWeight: 800 }}
            value={doc.title}
            onChange={(e) => setDoc({ ...doc, title: e.target.value })}
            aria-label="Titre de la story"
          />
          <span className="badge draft">📱 Story 1080×1920</span>
          <div className="top-actions">
            <span style={{ color: "var(--sage-deep)", fontSize: 13, fontWeight: 700, opacity: saved ? 1 : 0, transition: "opacity .3s" }}>✓ Enregistré</span>
          </div>
        </header>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <SlidesRail
            slides={slides}
            activeIndex={idx}
            onSelect={setActive}
            onAdd={() => { setSlides([...slides, newSlide()]); setActive(slides.length); }}
            onDuplicate={(i) => {
              const copy = { ...slides[i], id: uid(), lines: slides[i].lines.map((l) => ({ ...l, id: uid() })) };
              setSlides([...slides.slice(0, i + 1), copy, ...slides.slice(i + 1)]);
              setActive(i + 1);
            }}
            onDelete={(i) => {
              if (slides.length <= 1) return;
              const next = slides.filter((_, j) => j !== i);
              setSlides(next);
              setActive(Math.min(idx, next.length - 1));
            }}
            onMove={(i, dir) => {
              const j = i + dir;
              if (j < 0 || j >= slides.length) return;
              const next = [...slides];
              [next[i], next[j]] = [next[j], next[i]];
              setSlides(next);
              setActive(j);
            }}
          />

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#eaf1ef", padding: 16 }}>
            <CanvasPreview slide={slide} />
          </div>

          {slide && (
            <ContentInspector
              lines={slide.lines}
              onChangeText={(lid, text) => updateSlide(idx, (s) => ({ ...s, lines: s.lines.map((l) => (l.id === lid ? { ...l, text } : l)) }))}
              onChangeStyle={(lid, style: LineStyleKey) => updateSlide(idx, (s) => ({ ...s, lines: s.lines.map((l) => (l.id === lid ? { ...l, style } : l)) }))}
              onAdd={() => updateSlide(idx, (s) => ({ ...s, lines: [...s.lines, newLine()] }))}
              onDelete={(lid) => updateSlide(idx, (s) => ({ ...s, lines: s.lines.length > 1 ? s.lines.filter((l) => l.id !== lid) : s.lines }))}
              onMove={(lid, dir) => updateSlide(idx, (s) => {
                const i = s.lines.findIndex((l) => l.id === lid);
                const j = i + dir;
                if (i < 0 || j < 0 || j >= s.lines.length) return s;
                const lines = [...s.lines];
                [lines[i], lines[j]] = [lines[j], lines[i]];
                return { ...s, lines };
              })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation** (Editor n'est pas encore importé ; il doit néanmoins typechecker)

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/src/pages/Editor.tsx
git commit -m "feat(editor): page éditeur 3 colonnes + sauvegarde automatique"
```

---

## Task 9 : Câblage final — routeur `App` + bibliothèque

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/pages/Library.tsx`

Ces deux fichiers sont mutuellement dépendants (App passe `onOpen` à Library) : on les modifie **ensemble, dans un seul commit**, pour ne jamais laisser un état intermédiaire qui ne compile pas.

- [ ] **Step 1 : Remplacer `app/src/App.tsx`**

```tsx
import { useState } from "react";
import { Library } from "@/pages/Library";
import { Editor } from "@/pages/Editor";

export type Route = { name: "library" } | { name: "editor"; id: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "library" });

  if (route.name === "editor") {
    return <Editor id={route.id} onBack={() => setRoute({ name: "library" })} />;
  }
  return <Library onOpen={(id) => setRoute({ name: "editor", id })} />;
}
```

- [ ] **Step 2 : Remplacer `app/src/pages/Library.tsx`**

```tsx
import { useEffect, useState } from "react";
import { fetchLibrary, createDoc, type DocMeta } from "@/lib/api";
import { newStoryPayload } from "@/lib/model";
import { Shell } from "@/components/Shell";

export function Library({ onOpen }: { onOpen: (id: string) => void }) {
  const [docs, setDocs] = useState<DocMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchLibrary().then(setDocs).catch((e) => setError(e.message));
  }, []);

  async function createStory() {
    setCreating(true);
    try {
      const doc = await createDoc(newStoryPayload());
      onOpen(doc.id);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  }

  return (
    <Shell
      active="creations"
      title="Créations"
      actions={
        <button type="button" className="btn primary" onClick={createStory} disabled={creating}>
          + Nouveau
        </button>
      }
    >
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
          <small>Clique sur « + Nouveau » pour créer ta première story.</small>
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
```

- [ ] **Step 3 : Build complet (tsc + vite)**

Run: `npm run build`
Expected: succès, aucune erreur TypeScript.

- [ ] **Step 4 : Commit**

```bash
git add app/src/App.tsx app/src/pages/Library.tsx
git commit -m "feat(app): routeur library<->editor + création/ouverture de story"
```

---

## Task 10 : Vérification end-to-end

- [ ] **Step 1 : Suite de tests**

Run: `npm test`
Expected: tous PASS — serveur (paths 2, store 3, api 4 = 9) + app (model 4, layout 4, draw 2 = 10).

- [ ] **Step 2 : Vérification navigateur (parcours réel)**

```bash
npm run build
NODE_ENV=production PORT=4321 node server/index.js &
SERVER_PID=$!
sleep 1
```

Sur `http://localhost:4321` (navigateur ou outil Puppeteer si disponible) :
1. **« + Nouveau »** → l'éditeur s'ouvre : 1 slide, aperçu sauge affichant « Nouveau slide ».
2. Modifier le texte d'une ligne dans l'inspecteur → l'aperçu se met à jour en direct.
3. Ajouter une ligne, la passer en « Sous-titre » → visible dans l'aperçu.
4. Ajouter un 2ᵉ slide, le sélectionner, l'éditer, revenir au 1ᵉ (↑/↓ pour réordonner).
5. Attendre l'indicateur **« ✓ Enregistré »**.
6. **←** pour revenir à la bibliothèque → la story apparaît dans le listing.
7. Recharger (F5), rouvrir la story → le contenu édité est bien là (persistance disque).

Contrôle disque :
```bash
ls data/stories/
node -e "fetch('http://localhost:4321/api/library').then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))"
kill $SERVER_PID
```
Expected: un fichier `<id>.json` dans `data/stories/`, listing renvoyant la story.

- [ ] **Step 3 : Commit** (uniquement si des correctifs ont été nécessaires ; sinon rien).

---

## Definition of Done (Phase 2)

- Moteur de rendu pur (`model`, `layout`, `draw`) couvert par tests unitaires.
- Bibliothèque : **« + Nouveau »** crée une story et ouvre l'éditeur ; clic sur une ligne rouvre une story.
- Éditeur 3 colonnes : slides (ajout/dupliquer/supprimer/↑↓) · **aperçu canvas en direct** (fond sauge, texte blanc, styles par défaut) · inspecteur « Contenu ».
- **Sauvegarde automatique** sur disque + indicateur « ✓ Enregistré » ; persistance vérifiée au rechargement.
- `npm test` vert, `npm run build` vert.
- Base prête pour la **Phase 3 (bibliothèque : filtres, statuts, dupliquer/supprimer, posts)** et la **Phase 4 (inspecteur complet)**.
```
