# Atelier de Stories — Phase 4A : Typographie & mise en page · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la typographie et la mise en page réglables par document : chaque document porte ses propres styles (police, corps, couleur, alignement, marges liées/déliées), une marge de contenu et une position de bloc ; l'aperçu reflète ces réglages via un inspecteur à onglets (Contenu · Texte · Format).

**Architecture:** Le moteur de rendu cesse d'utiliser des styles figés (`DEFAULT_STYLES`) et lit des styles **portés par le document** (initialisés depuis les défauts). On introduit l'alignement, la position verticale du bloc et une marge de contenu par côté. L'inspecteur de l'éditeur devient un système à onglets ; l'onglet « Texte » édite les styles du document, l'onglet « Format » la marge de contenu et la position du bloc.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind + « Sérénité », Canvas 2D, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-07-12-atelier-stories-altitude-design.md` (§6.3 Styles, §9 Texte/Format, §10 Rendu).

**Décomposition de la Phase 4 :** 4A (ce plan) = typographie & mise en page. 4B = fonds & voile. 4C = logo. Chaque sous-phase est un incrément fonctionnel.

**Portée EXCLUE de la 4A :** fonds/images/voile & recadrage (4B) · logo (4C) · surcharge de ligne dans l'UI (le modèle la supporte, l'UI viendra ensuite) · changement de format après création & durées par slide (Phase 5, avec l'animation/export) · polices personnalisées uploadées (4B/ultérieur — la 4A propose une courte liste de polices déjà disponibles).

**Ordre :** modèle & moteur (purs, testés) d'abord, puis client/aperçu, puis les panneaux et l'éditeur à onglets, enfin la vérification. On ne laisse jamais le projet dans un état non compilable.

---

## Structure de fichiers de cette phase

```
app/src/
├─ lib/
│  ├─ model.ts               ← (MODIFIÉ) StyleDef {align, margins}, doc {styles, contentMargin, blockPosition}, Line.override, helpers
│  ├─ api.ts                 ← (MODIFIÉ) StoryDoc : champs de mise en page optionnels
│  └─ renderer/
│     ├─ layout.ts           ← (MODIFIÉ) marges par côté + résolution des surcharges
│     └─ draw.ts             ← (MODIFIÉ) alignement + position du bloc + marge de contenu
├─ components/
│  ├─ CanvasPreview.tsx      ← (MODIFIÉ) reçoit styles/contentMargin/blockPosition
│  ├─ MarginsEditor.tsx      ← (NOUVEAU) éditeur de marges liées/déliées
│  ├─ TextInspector.tsx      ← (NOUVEAU) onglet « Texte » : réglage des styles
│  ├─ FormatInspector.tsx    ← (NOUVEAU) onglet « Format » : marge de contenu + position du bloc
│  └─ ContentInspector.tsx   ← (inchangé)
└─ pages/
   └─ Editor.tsx             ← (MODIFIÉ) normalisation du doc + inspecteur à onglets
```

---

## Task 1 : Modèle — styles configurables, marges, mise en page

**Files:**
- Modify: `app/src/lib/model.ts`
- Test: `app/src/lib/model.test.ts`

- [ ] **Step 1 : Ajouter les tests** au fichier existant `app/src/lib/model.test.ts`. Modifier la ligne d'import :
```ts
import { DEFAULT_STYLES, newLine, newSlide, newStoryPayload, newPostPayload, STYLE_KEYS } from "./model";
```
en :
```ts
import { DEFAULT_STYLES, newLine, newSlide, newStoryPayload, newPostPayload, STYLE_KEYS, mergeStyle, ensureDocDefaults, defaultContentMargin } from "./model";
```
Puis ajouter, APRÈS le `describe("model", ...)` existant, un nouveau bloc :
```ts
describe("styles & mise en page", () => {
  it("chaque style par défaut a un alignement et 4 marges", () => {
    for (const k of STYLE_KEYS) {
      expect(DEFAULT_STYLES[k].align).toBe("left");
      const m = DEFAULT_STYLES[k].margins;
      expect(typeof m.top).toBe("number");
      expect(typeof m.right).toBe("number");
      expect(typeof m.bottom).toBe("number");
      expect(typeof m.left).toBe("number");
    }
  });

  it("mergeStyle applique une surcharge partielle (dont marges)", () => {
    const base = DEFAULT_STYLES.text;
    const merged = mergeStyle(base, { size: 100, margins: { ...base.margins, left: 80 } });
    expect(merged.size).toBe(100);
    expect(merged.margins.left).toBe(80);
    expect(merged.color).toBe(base.color); // non surchargé conservé
  });

  it("mergeStyle sans surcharge renvoie le style de base", () => {
    expect(mergeStyle(DEFAULT_STYLES.title, undefined)).toEqual(DEFAULT_STYLES.title);
  });

  it("newStoryPayload embarque styles, contentMargin (50) et blockPosition", () => {
    const p = newStoryPayload();
    expect(Object.keys(p.styles).sort()).toEqual([...STYLE_KEYS].sort());
    expect(p.contentMargin).toEqual({ linked: true, top: 50, right: 50, bottom: 50, left: 50 });
    expect(p.blockPosition).toBe("center");
  });

  it("ensureDocDefaults complète un doc sans réglages de mise en page", () => {
    const doc = ensureDocDefaults({
      id: "x", type: "story", format: "9:16", title: "T", status: "draft",
      createdAt: "now", updatedAt: "now", slides: [],
    });
    expect(doc.blockPosition).toBe("center");
    expect(doc.contentMargin).toEqual(defaultContentMargin());
    expect(Object.keys(doc.styles).length).toBe(STYLE_KEYS.length);
  });

  it("ensureDocDefaults préserve les réglages existants", () => {
    const cm = { linked: false, top: 10, right: 20, bottom: 30, left: 40 };
    const doc = ensureDocDefaults({
      id: "x", type: "story", format: "9:16", title: "T", status: "draft",
      createdAt: "now", updatedAt: "now", slides: [], contentMargin: cm, blockPosition: "top",
    });
    expect(doc.contentMargin).toEqual(cm);
    expect(doc.blockPosition).toBe("top");
  });
});
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: FAIL — `mergeStyle`/`ensureDocDefaults`/`defaultContentMargin` non exportés, et `DEFAULT_STYLES[k].align`/`.margins` indéfinis.

- [ ] **Step 3 : Réécrire `app/src/lib/model.ts`** entièrement avec ce contenu :

```ts
export type LineStyleKey = "title" | "subtitle" | "text" | "bullet" | "arrow" | "note";

export const STYLE_KEYS: LineStyleKey[] = ["title", "subtitle", "text", "bullet", "arrow", "note"];

export type Format = "9:16" | "1:1" | "4:5";
export type BlockPosition = "top" | "center" | "bottom";
export type Align = "left" | "center";

export interface Margins {
  linked: boolean;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type ContentMargin = Margins;

export interface StyleDef {
  label: string;
  font: string;
  size: number;
  color: string;
  align: Align;
  lineHeight: number;
  mark: string | null;
  margins: Margins;
}

export const DEFAULT_FONT = "Nunito";
export const FONT_CHOICES = ["Nunito", "Georgia", "Arial"];
export const COLOR_CHOICES = ["#ffffff", "#2f3a34", "#4e7a63", "#c9836a", "#eaf5f2"];

const m = (top: number, left = 0): Margins => ({ linked: false, top, right: 0, bottom: 0, left });

export const DEFAULT_STYLES: Record<LineStyleKey, StyleDef> = {
  title:    { label: "Titre",      font: DEFAULT_FONT, size: 78, color: "#ffffff",                 align: "left", lineHeight: 1.12, mark: null, margins: m(0) },
  subtitle: { label: "Sous-titre", font: DEFAULT_FONT, size: 48, color: "#ffffff",                 align: "left", lineHeight: 1.2,  mark: null, margins: m(52) },
  text:     { label: "Texte",      font: DEFAULT_FONT, size: 39, color: "rgba(255,255,255,.95)",   align: "left", lineHeight: 1.32, mark: null, margins: m(24) },
  bullet:   { label: "Puce",       font: DEFAULT_FONT, size: 38, color: "rgba(255,255,255,.95)",   align: "left", lineHeight: 1.3,  mark: "•",  margins: m(14, 44) },
  arrow:    { label: "Créneau",    font: DEFAULT_FONT, size: 42, color: "#eaf5f2",                 align: "left", lineHeight: 1.24, mark: "→",  margins: m(10, 44) },
  note:     { label: "Note",       font: DEFAULT_FONT, size: 31, color: "rgba(255,255,255,.82)",   align: "left", lineHeight: 1.36, mark: null, margins: m(40) },
};

export interface Line {
  id: string;
  style: LineStyleKey;
  text: string;
  override?: Partial<StyleDef>;
}

export interface Slide {
  id: string;
  name?: string;
  lines: Line[];
}

export interface StoryPayload {
  type: "story" | "post";
  format: Format;
  postMode?: "single" | "carousel";
  title: string;
  status: "draft" | "ready";
  date: string;
  styles: Record<LineStyleKey, StyleDef>;
  contentMargin: ContentMargin;
  blockPosition: BlockPosition;
  slides: Slide[];
}

/** Forme minimale d'un document chargé depuis le disque (réglages de mise en page éventuellement absents). */
export interface DocLike {
  id: string;
  type: "story" | "post";
  format: string;
  postMode?: "single" | "carousel";
  title: string;
  status: "draft" | "ready";
  date?: string;
  createdAt: string;
  updatedAt: string;
  styles?: Record<LineStyleKey, StyleDef>;
  contentMargin?: ContentMargin;
  blockPosition?: BlockPosition;
  slides: Slide[];
}

/** Document normalisé : les réglages de mise en page sont garantis présents. */
export interface ResolvedDoc extends DocLike {
  styles: Record<LineStyleKey, StyleDef>;
  contentMargin: ContentMargin;
  blockPosition: BlockPosition;
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

export function defaultStyles(): Record<LineStyleKey, StyleDef> {
  return structuredClone(DEFAULT_STYLES);
}

export function defaultContentMargin(): ContentMargin {
  return { linked: true, top: 50, right: 50, bottom: 50, left: 50 };
}

/** Fusionne un style de base avec une surcharge partielle (les marges se fusionnent en profondeur). */
export function mergeStyle(base: StyleDef, override?: Partial<StyleDef>): StyleDef {
  if (!override) return base;
  return { ...base, ...override, margins: { ...base.margins, ...(override.margins ?? {}) } };
}

export function ensureDocDefaults(doc: DocLike): ResolvedDoc {
  return {
    ...doc,
    styles: doc.styles ?? defaultStyles(),
    contentMargin: doc.contentMargin ?? defaultContentMargin(),
    blockPosition: doc.blockPosition ?? "center",
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function baseNew(type: "story" | "post", format: Format, title: string): StoryPayload {
  return {
    type,
    format,
    title,
    status: "draft",
    date: today(),
    styles: defaultStyles(),
    contentMargin: defaultContentMargin(),
    blockPosition: "center",
    slides: [newSlide()],
  };
}

export function newStoryPayload(title = "Nouvelle story"): StoryPayload {
  return baseNew("story", "9:16", title);
}

export function newPostPayload(format: Format = "1:1", title = "Nouveau post"): StoryPayload {
  return { ...baseNew("post", format, title), postMode: "single" };
}
```

- [ ] **Step 4 : Lancer les tests (succès attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: PASS (les tests existants + les 6 nouveaux).

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/model.ts app/src/lib/model.test.ts
git commit -m "feat(model): styles configurables (align, marges) + contentMargin + blockPosition"
```

---

## Task 2 : Mise en page — marges par côté et surcharges

**Files:**
- Modify: `app/src/lib/renderer/layout.ts`
- Test: `app/src/lib/renderer/layout.test.ts` (remplacement complet)

- [ ] **Step 1 : Remplacer entièrement `app/src/lib/renderer/layout.test.ts`** par :

```ts
import { describe, it, expect } from "vitest";
import { layoutSlide, wrapText, fontString } from "./layout";
import { DEFAULT_STYLES } from "../model";

const measure = (t: string) => t.length * 10;

describe("wrapText", () => {
  it("coupe le texte pour tenir dans la largeur", () => {
    expect(wrapText("aaa bbb ccc", 60, measure).length).toBeGreaterThan(1);
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
  it("produit un bloc par ligne, sans écart avant la 1re", () => {
    const lines = [
      { id: "1", style: "title" as const, text: "Titre" },
      { id: "2", style: "text" as const, text: "Un texte" },
    ];
    const layout = layoutSlide(lines, DEFAULT_STYLES, { contentWidth: 980, measure: (t) => t.length * 10 });
    expect(layout.blocks).toHaveLength(2);
    expect(layout.blocks[0].gapBefore).toBe(0);
    expect(layout.blocks[1].gapBefore).toBe(DEFAULT_STYLES.text.margins.top);
    expect(layout.totalHeight).toBeGreaterThan(0);
  });

  it("applique la surcharge de ligne (override)", () => {
    const lines = [
      { id: "1", style: "text" as const, text: "X", override: { size: 100 } },
    ];
    const layout = layoutSlide(lines, DEFAULT_STYLES, { contentWidth: 980, measure: (t) => t.length * 10 });
    expect(layout.blocks[0].style.size).toBe(100);
  });
});
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run app/src/lib/renderer/layout.test.ts`
Expected: FAIL — `gapBefore`/`override` non gérés par l'implémentation actuelle.

- [ ] **Step 3 : Remplacer entièrement `app/src/lib/renderer/layout.ts`** par :

```ts
import type { Line, LineStyleKey, StyleDef } from "../model";
import { mergeStyle } from "../model";

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
  style: StyleDef; // style résolu (base + surcharge)
  font: string;
  wrapped: string[];
  lineHeight: number;
  markWidth: number;
  height: number;
  gapBefore: number;
  gapAfter: number;
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
    const st = mergeStyle(styles[ln.style] ?? styles.text, ln.override);
    const font = fontString(st);
    const markWidth = st.mark ? measure(st.mark + "  ", font) : 0;
    const avail = contentWidth - st.margins.left - st.margins.right - markWidth;
    const wrapped = wrapText(ln.text, avail, (t) => measure(t, font));
    const lineHeight = st.size * st.lineHeight;
    const height = wrapped.length * lineHeight;
    const gapBefore = i === 0 ? 0 : st.margins.top;
    const gapAfter = st.margins.bottom;
    blocks.push({ line: ln, style: st, font, wrapped, lineHeight, markWidth, height, gapBefore, gapAfter });
    total += gapBefore + height + gapAfter;
  });
  return { blocks, totalHeight: total };
}
```

- [ ] **Step 4 : Lancer les tests (succès attendu)**

Run: `npx vitest run app/src/lib/renderer/layout.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/renderer/layout.ts app/src/lib/renderer/layout.test.ts
git commit -m "feat(renderer): marges par côté + résolution des surcharges de ligne"
```

---

## Task 3 : Dessin — alignement, position du bloc, marge de contenu

**Files:**
- Modify: `app/src/lib/renderer/draw.ts`
- Test: `app/src/lib/renderer/draw.test.ts` (remplacement complet)

- [ ] **Step 1 : Remplacer entièrement `app/src/lib/renderer/draw.test.ts`** par :

```ts
import { describe, it, expect } from "vitest";
import { drawSlide, STORY_DIMS, dimsFor, DIMS } from "./draw";
import { DEFAULT_STYLES, defaultContentMargin } from "../model";

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

const opts = { dims: STORY_DIMS, background: "#4e7a63", contentMargin: defaultContentMargin(), blockPosition: "center" as const };

describe("drawSlide", () => {
  it("peint le fond puis le texte", () => {
    const ctx = fakeCtx();
    const slide = { id: "s", lines: [{ id: "1", style: "title" as const, text: "Bonjour" }] };
    drawSlide(ctx as any, slide, DEFAULT_STYLES, opts);
    const kinds = ctx.calls.map((c) => c[0]);
    expect(kinds).toContain("fillRect");
    expect(ctx.calls.some((c) => c[0] === "fillText" && c[1] === "Bonjour")).toBe(true);
  });

  it("centre le bloc plus bas que lorsqu'il est en haut", () => {
    const slide = { id: "s", lines: [{ id: "1", style: "title" as const, text: "Hi" }] };
    const yOf = (blockPosition: "top" | "center" | "bottom") => {
      const ctx = fakeCtx();
      drawSlide(ctx as any, slide, DEFAULT_STYLES, { ...opts, blockPosition });
      const t = ctx.calls.find((c) => c[0] === "fillText" && c[1] === "Hi");
      return t ? t[3] : 0; // y de la ligne de base
    };
    expect(yOf("center")).toBeGreaterThan(yOf("top"));
    expect(yOf("bottom")).toBeGreaterThan(yOf("center"));
  });

  it("STORY_DIMS = 1080x1920, marge 50", () => {
    expect(STORY_DIMS).toEqual({ width: 1080, height: 1920, margin: 50 });
  });
});

describe("dimsFor", () => {
  it("donne les bonnes dimensions par format", () => {
    expect(dimsFor("1:1")).toEqual({ width: 1080, height: 1080, margin: 50 });
    expect(dimsFor("4:5")).toEqual({ width: 1080, height: 1350, margin: 50 });
  });
  it("retombe sur 9:16 pour un format inconnu", () => {
    expect(dimsFor("bidon")).toEqual(DIMS["9:16"]);
  });
});
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: FAIL — `drawSlide` ne connaît pas encore `contentMargin`/`blockPosition`.

- [ ] **Step 3 : Remplacer entièrement `app/src/lib/renderer/draw.ts`** par :

```ts
import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition } from "../model";
import { layoutSlide } from "./layout";

export interface Dims {
  width: number;
  height: number;
  margin: number;
}

export const DIMS: Record<string, Dims> = {
  "9:16": { width: 1080, height: 1920, margin: 50 },
  "1:1": { width: 1080, height: 1080, margin: 50 },
  "4:5": { width: 1080, height: 1350, margin: 50 },
};

export function dimsFor(format: string): Dims {
  return DIMS[format] ?? DIMS["9:16"];
}

export const STORY_DIMS: Dims = DIMS["9:16"];

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
  opts: { dims: Dims; background: string; contentMargin: ContentMargin; blockPosition: BlockPosition },
): void {
  const { width, height } = opts.dims;
  const cm = opts.contentMargin;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, width, height);

  const contentLeft = cm.left;
  const contentRight = width - cm.right;
  const contentWidth = contentRight - contentLeft;

  const layout = layoutSlide(slide.lines, styles, {
    contentWidth,
    measure: (t, f) => {
      ctx.font = f;
      return ctx.measureText(t).width;
    },
  });

  const bandTop = cm.top;
  const bandBottom = height - cm.bottom;
  let y: number;
  if (opts.blockPosition === "top") y = bandTop;
  else if (opts.blockPosition === "bottom") y = Math.max(bandTop, bandBottom - layout.totalHeight);
  else y = bandTop + Math.max(0, (bandBottom - bandTop - layout.totalHeight) / 2);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  for (const b of layout.blocks) {
    y += b.gapBefore;
    const st = b.style;
    ctx.font = b.font;
    const firstBaseline = y + st.size * 0.8;
    const markX = contentLeft + st.margins.left;
    const areaLeft = markX + b.markWidth;
    const areaRight = contentRight - st.margins.right;

    if (st.mark) {
      ctx.fillStyle = st.color;
      ctx.fillText(st.mark, markX, firstBaseline);
    }

    ctx.fillStyle = st.color;
    b.wrapped.forEach((tline, k) => {
      const baseline = firstBaseline + k * b.lineHeight;
      if (st.align === "center") {
        const w = ctx.measureText(tline).width;
        ctx.fillText(tline, (areaLeft + areaRight) / 2 - w / 2, baseline);
      } else {
        ctx.fillText(tline, areaLeft, baseline);
      }
    });

    y += b.height + b.gapAfter;
  }
}
```

- [ ] **Step 4 : Lancer les tests (succès attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/renderer/draw.ts app/src/lib/renderer/draw.test.ts
git commit -m "feat(renderer): alignement + position du bloc + marge de contenu par côté"
```

---

## Task 4 : Client API — champs de mise en page sur StoryDoc

**Files:**
- Modify: `app/src/lib/api.ts`

- [ ] **Step 1 : Mettre à jour les imports.** Trouver :
```ts
import type { Slide, StoryPayload, Format } from "./model";
```
et remplacer par (une ligne de types + une ligne de valeur pour `ensureDocDefaults`) :
```ts
import type { Slide, StoryPayload, Format, LineStyleKey, StyleDef, ContentMargin, BlockPosition } from "./model";
import { ensureDocDefaults } from "./model";
```

- [ ] **Step 2 : Étendre l'interface `StoryDoc`.** Trouver la définition existante :
```ts
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
```
et la remplacer par :
```ts
export interface StoryDoc {
  id: string;
  type: "story" | "post";
  format: string;
  postMode?: "single" | "carousel";
  title: string;
  status: "draft" | "ready";
  date?: string;
  createdAt: string;
  updatedAt: string;
  styles?: Record<LineStyleKey, StyleDef>;
  contentMargin?: ContentMargin;
  blockPosition?: BlockPosition;
  slides: Slide[];
}
```

- [ ] **Step 3 : Adapter `duplicateDoc`.** `StoryPayload` requiert désormais `styles`/`contentMargin`/`blockPosition` ; la fonction existante ne les fournit pas. Remplacer entièrement la fonction `duplicateDoc` par :
```ts
export async function duplicateDoc(id: string): Promise<StoryDoc> {
  const src = ensureDocDefaults(await getDoc(id));
  const payload: StoryPayload = {
    type: src.type,
    format: src.format as Format,
    postMode: src.type === "post" ? "single" : undefined,
    title: `${src.title} (copie)`,
    status: "draft",
    date: src.date ?? new Date().toISOString().slice(0, 10),
    styles: src.styles,
    contentMargin: src.contentMargin,
    blockPosition: src.blockPosition,
    slides: src.slides,
  };
  return createDoc(payload);
}
```

- [ ] **Step 4 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/api.ts
git commit -m "feat(api): StoryDoc porte les réglages de mise en page + duplicateDoc adapté"
```

---

## Task 5 : Aperçu — recevoir styles, marge de contenu, position

**Files:**
- Modify: `app/src/components/CanvasPreview.tsx` (remplacement complet)

- [ ] **Step 1 : Remplacer entièrement `app/src/components/CanvasPreview.tsx`** par :

Les nouvelles props sont **optionnelles avec valeurs par défaut**, pour que l'ancien montage `<CanvasPreview slide format />` (dans l'éditeur, recâblé plus tard en Task 8) continue de compiler entre-temps.

```tsx
import { useEffect, useRef } from "react";
import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition } from "@/lib/model";
import { DEFAULT_STYLES, defaultContentMargin } from "@/lib/model";
import { drawSlide, dimsFor } from "@/lib/renderer/draw";

const DEFAULT_BG = "#4e7a63"; // fond sauge par défaut (fonds/images en Phase 4B)

export function CanvasPreview({
  slide, format, styles, contentMargin, blockPosition,
}: {
  slide: Slide | null;
  format: string;
  styles?: Record<LineStyleKey, StyleDef>;
  contentMargin?: ContentMargin;
  blockPosition?: BlockPosition;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dims = dimsFor(format);
  const st = styles ?? DEFAULT_STYLES;
  const cm = contentMargin ?? defaultContentMargin();
  const bp = blockPosition ?? "center";

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      if (slide) {
        drawSlide(ctx, slide, st, { dims, background: DEFAULT_BG, contentMargin: cm, blockPosition: bp });
      } else {
        ctx.clearRect(0, 0, dims.width, dims.height);
      }
    });
    return () => { cancelled = true; };
  }, [slide, st, cm, bp, dims.width, dims.height, dims.margin]);

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

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur (l'ancien montage de l'éditeur reste valide grâce aux props optionnelles).

- [ ] **Step 3 : Commit**

```bash
git add app/src/components/CanvasPreview.tsx
git commit -m "feat(preview): reçoit styles + marge de contenu + position du bloc"
```

---

## Task 6 : Éditeur de marges + inspecteur « Texte »

**Files:**
- Create: `app/src/components/MarginsEditor.tsx`
- Create: `app/src/components/TextInspector.tsx`

- [ ] **Step 1 : Implémenter `app/src/components/MarginsEditor.tsx`**

```tsx
import type { Margins } from "@/lib/model";

const box: React.CSSProperties = { width: "100%", padding: "5px 6px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 8, fontFamily: "inherit" };
const cell: React.CSSProperties = { fontSize: 10, color: "var(--muted)", textAlign: "center" };

export function MarginsEditor({ margins, onChange }: { margins: Margins; onChange: (m: Margins) => void }) {
  const toggleLink = () => {
    if (!margins.linked) {
      const v = margins.top;
      onChange({ linked: true, top: v, right: v, bottom: v, left: v });
    } else {
      onChange({ ...margins, linked: false });
    }
  };
  const setAll = (v: number) => onChange({ linked: true, top: v, right: v, bottom: v, left: v });
  const setSide = (side: "top" | "right" | "bottom" | "left", v: number) => onChange({ ...margins, [side]: v });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800 }}>Marges (px)</span>
        <button type="button" onClick={toggleLink} title={margins.linked ? "Délier" : "Lier"}
          style={{ border: "1px solid var(--line)", background: margins.linked ? "#e3efe7" : "#fff", borderRadius: 999, padding: "2px 9px", fontSize: 11, cursor: "pointer", color: "var(--sage-deep)" }}>
          {margins.linked ? "🔗 Liées" : "⛓️‍💥 Déliées"}
        </button>
      </div>
      {margins.linked ? (
        <input type="number" style={box} value={margins.top} onChange={(e) => setAll(Number(e.target.value) || 0)} aria-label="Marge (toutes)" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
          <div><div style={cell}>haut</div><input type="number" style={box} value={margins.top} onChange={(e) => setSide("top", Number(e.target.value) || 0)} /></div>
          <div><div style={cell}>bas</div><input type="number" style={box} value={margins.bottom} onChange={(e) => setSide("bottom", Number(e.target.value) || 0)} /></div>
          <div><div style={cell}>gche</div><input type="number" style={box} value={margins.left} onChange={(e) => setSide("left", Number(e.target.value) || 0)} /></div>
          <div><div style={cell}>drte</div><input type="number" style={box} value={margins.right} onChange={(e) => setSide("right", Number(e.target.value) || 0)} /></div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Implémenter `app/src/components/TextInspector.tsx`**

```tsx
import { useState } from "react";
import type { LineStyleKey, StyleDef } from "@/lib/model";
import { STYLE_KEYS, DEFAULT_STYLES, FONT_CHOICES, COLOR_CHOICES } from "@/lib/model";
import { MarginsEditor } from "./MarginsEditor";

const field: React.CSSProperties = { width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 8, fontFamily: "inherit", background: "#fff" };
const label: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800, margin: "10px 0 4px" };

export function TextInspector({
  styles, onChangeStyle,
}: {
  styles: Record<LineStyleKey, StyleDef>;
  onChangeStyle: (key: LineStyleKey, next: StyleDef) => void;
}) {
  const [key, setKey] = useState<LineStyleKey>("title");
  const st = styles[key];
  const set = (patch: Partial<StyleDef>) => onChangeStyle(key, { ...st, ...patch });

  return (
    <div style={{ width: 260, borderLeft: "1px solid var(--line)", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto", padding: 12 }}>
      <div style={{ fontWeight: 800, color: "var(--sage-deep)", fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Texte</div>

      <div style={label}>Style à régler</div>
      <select style={field} value={key} onChange={(e) => setKey(e.target.value as LineStyleKey)}>
        {STYLE_KEYS.map((k) => (<option key={k} value={k}>{DEFAULT_STYLES[k].label}</option>))}
      </select>

      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={label}>Police</div>
          <select style={field} value={st.font} onChange={(e) => set({ font: e.target.value })}>
            {FONT_CHOICES.map((f) => (<option key={f} value={f}>{f}</option>))}
          </select>
        </div>
        <div style={{ width: 70 }}>
          <div style={label}>Corps</div>
          <input type="number" style={field} value={st.size} onChange={(e) => set({ size: Number(e.target.value) || 1 })} />
        </div>
      </div>

      <div style={label}>Couleur</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {COLOR_CHOICES.map((c) => (
          <button key={c} type="button" onClick={() => set({ color: c })} title={c}
            style={{ width: 22, height: 22, borderRadius: 6, background: c, cursor: "pointer", border: st.color === c ? "2px solid var(--sage)" : "1px solid var(--line)" }} />
        ))}
      </div>

      <div style={label}>Alignement</div>
      <div style={{ display: "flex", gap: 6 }}>
        {(["left", "center"] as const).map((a) => (
          <button key={a} type="button" onClick={() => set({ align: a })}
            style={{ flex: 1, padding: "6px 0", fontSize: 12, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              border: st.align === a ? "1.5px solid var(--sage)" : "1px solid var(--line)", background: st.align === a ? "#e3efe7" : "#fff", color: "var(--ink)" }}>
            {a === "left" ? "⯇ Gauche" : "≡ Centré"}
          </button>
        ))}
      </div>

      <div style={label}>Interligne</div>
      <input type="number" step="0.05" style={field} value={st.lineHeight} onChange={(e) => set({ lineHeight: Number(e.target.value) || 1 })} />

      <div style={{ marginTop: 10 }}>
        <MarginsEditor margins={st.margins} onChange={(margins) => set({ margins })} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add app/src/components/MarginsEditor.tsx app/src/components/TextInspector.tsx
git commit -m "feat(editor): éditeur de marges liées/déliées + inspecteur Texte (styles)"
```

---

## Task 7 : Inspecteur « Format »

**Files:**
- Create: `app/src/components/FormatInspector.tsx`

- [ ] **Step 1 : Implémenter `app/src/components/FormatInspector.tsx`**

```tsx
import type { ContentMargin, BlockPosition } from "@/lib/model";
import { MarginsEditor } from "./MarginsEditor";

const label: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800, margin: "10px 0 4px" };

export function FormatInspector({
  formatLabel, contentMargin, blockPosition, onChangeContentMargin, onChangeBlockPosition,
}: {
  formatLabel: string;
  contentMargin: ContentMargin;
  blockPosition: BlockPosition;
  onChangeContentMargin: (m: ContentMargin) => void;
  onChangeBlockPosition: (p: BlockPosition) => void;
}) {
  return (
    <div style={{ width: 260, borderLeft: "1px solid var(--line)", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto", padding: 12 }}>
      <div style={{ fontWeight: 800, color: "var(--sage-deep)", fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Format</div>

      <div style={label}>Format de sortie</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{formatLabel}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Le changement de format arrivera avec l'export.</div>

      <div style={{ marginTop: 12 }}>
        <MarginsEditor margins={contentMargin} onChange={onChangeContentMargin} />
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Marge de contenu (zone de sécurité, 50 px par défaut).</div>

      <div style={label}>Position du bloc</div>
      <div style={{ display: "flex", gap: 6 }}>
        {(["top", "center", "bottom"] as const).map((p) => (
          <button key={p} type="button" onClick={() => onChangeBlockPosition(p)}
            style={{ flex: 1, padding: "6px 0", fontSize: 12, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              border: blockPosition === p ? "1.5px solid var(--sage)" : "1px solid var(--line)", background: blockPosition === p ? "#e3efe7" : "#fff", color: "var(--ink)" }}>
            {p === "top" ? "Haut" : p === "center" ? "Centre" : "Bas"}
          </button>
        ))}
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
git add app/src/components/FormatInspector.tsx
git commit -m "feat(editor): inspecteur Format (marge de contenu + position du bloc)"
```

---

## Task 8 : Éditeur — normalisation + inspecteur à onglets

**Files:**
- Modify: `app/src/pages/Editor.tsx` (remplacement complet)

- [ ] **Step 1 : Remplacer entièrement `app/src/pages/Editor.tsx`** par :

```tsx
import { useEffect, useRef, useState } from "react";
import { getDoc, updateDoc } from "@/lib/api";
import {
  newSlide, newLine, uid, ensureDocDefaults,
  type LineStyleKey, type StyleDef, type ContentMargin, type BlockPosition, type ResolvedDoc,
} from "@/lib/model";
import { CanvasPreview } from "@/components/CanvasPreview";
import { SlidesRail } from "@/components/SlidesRail";
import { ContentInspector } from "@/components/ContentInspector";
import { TextInspector } from "@/components/TextInspector";
import { FormatInspector } from "@/components/FormatInspector";

type Tab = "contenu" | "texte" | "format";

function formatLabel(type: string, format: string): string {
  if (type === "post") return format === "4:5" ? "🖼️ Post 1080×1350" : "🖼️ Post 1080×1080";
  return "📱 Story 1080×1920";
}

export function Editor({ id, onBack }: { id: string; onBack: () => void }) {
  const [doc, setDoc] = useState<ResolvedDoc | null>(null);
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<Tab>("contenu");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const firstLoad = useRef(true);

  useEffect(() => {
    getDoc(id).then((d) => setDoc(ensureDocDefaults(d))).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!doc) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateDoc(id, doc)
        .then(() => { dirty.current = false; setSaved(true); setTimeout(() => setSaved(false), 1200); })
        .catch((e) => setError((e as Error).message));
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [doc, id]);

  const handleBack = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (dirty.current && doc) { dirty.current = false; updateDoc(id, doc).catch(() => {}); }
    onBack();
  };

  if (error) return <div className="empty" style={{ padding: 40 }}>Erreur : {error} <button className="btn ghost" onClick={handleBack}>← Retour</button></div>;
  if (!doc) return <div className="empty" style={{ padding: 40 }}>Chargement…</div>;

  const slides = doc.slides;
  const idx = Math.min(active, slides.length - 1);
  const slide = slides[idx] ?? null;

  const setSlides = (next: typeof slides) => setDoc({ ...doc, slides: next });
  const updateSlide = (i: number, fn: (s: typeof slides[number]) => typeof slides[number]) =>
    setSlides(slides.map((s, j) => (j === i ? fn(s) : s)));

  const tabBtn = (t: Tab, lbl: string) => (
    <button type="button" className={`tab${tab === t ? " active" : ""}`} style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => setTab(t)}>{lbl}</button>
  );

  return (
    <div className="app" style={{ gridTemplateColumns: "1fr" }}>
      <div className="content">
        <header className="topbar">
          <button className="btn ghost" onClick={handleBack}>←</button>
          <input className="input" style={{ maxWidth: 240, fontWeight: 800 }} value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} aria-label="Titre" />
          <span className="badge draft">{formatLabel(doc.type, doc.format)}</span>
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

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#eaf1ef", padding: 16 }}>
            <CanvasPreview slide={slide} format={doc.format} styles={doc.styles} contentMargin={doc.contentMargin} blockPosition={doc.blockPosition} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--line)", background: "#fff", minWidth: 260 }}>
            <div className="tabs" style={{ margin: 0, padding: "8px 8px 0", gap: 4, borderBottom: "1px solid var(--line)" }}>
              {tabBtn("contenu", "Contenu")}
              {tabBtn("texte", "Texte")}
              {tabBtn("format", "Format")}
            </div>
            <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
              {tab === "contenu" && slide && (
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
              {tab === "texte" && (
                <TextInspector
                  styles={doc.styles}
                  onChangeStyle={(key: LineStyleKey, next: StyleDef) => setDoc({ ...doc, styles: { ...doc.styles, [key]: next } })}
                />
              )}
              {tab === "format" && (
                <FormatInspector
                  formatLabel={formatLabel(doc.type, doc.format)}
                  contentMargin={doc.contentMargin}
                  blockPosition={doc.blockPosition}
                  onChangeContentMargin={(cm: ContentMargin) => setDoc({ ...doc, contentMargin: cm })}
                  onChangeBlockPosition={(p: BlockPosition) => setDoc({ ...doc, blockPosition: p })}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Build complet (tsc + vite)**

Run: `npm run build`
Expected: succès, aucune erreur TypeScript (le projet compile de nouveau intégralement).

- [ ] **Step 3 : Commit**

```bash
git add app/src/pages/Editor.tsx
git commit -m "feat(editor): normalisation du doc + inspecteur à onglets (Contenu/Texte/Format)"
```

---

## Task 9 : Vérification end-to-end

- [ ] **Step 1 : Suite de tests**

Run: `npm test`
Expected: tous PASS — serveur 11 + app (model ~12, layout 4, draw 5, filter 7 = ~28). Le total dépend du décompte exact ; l'essentiel est **0 échec**.

- [ ] **Step 2 : Vérification navigateur (parcours réel)**

```bash
npm run build
NODE_ENV=production PORT=4321 node server/index.js &
SERVER_PID=$!
sleep 1
```

Sur `http://localhost:4321` (navigateur ou Puppeteer) :
1. Créer une **Story**, ouvrir l'éditeur, ajouter du texte sur quelques lignes.
2. Onglet **Texte** : sélectionner « Titre », changer le **corps** (ex. 60), la **couleur** (une pastille), l'**alignement** (Centré) → l'aperçu se met à jour en direct.
3. Régler les **marges** : cliquer 🔗 pour délier, mettre « gauche » à 120 → le titre se décale ; recliquer pour relier.
4. Onglet **Format** : passer la **position du bloc** à « Bas » → le texte descend ; régler la **marge de contenu** (valeur liée, ex. 100) → le contenu se resserre.
5. Onglet **Contenu** : l'édition des lignes fonctionne toujours ; l'indicateur **« ✓ Enregistré »** apparaît.
6. Revenir (←), rouvrir la story → **tous les réglages typographiques sont conservés** (persistance disque).

```bash
kill $SERVER_PID
```

- [ ] **Step 3 : Commit** (uniquement si des correctifs ont été nécessaires).

---

## Definition of Done (Phase 4A)

- Les styles (Titre, Sous-titre…) sont **réglables par document** : police, corps, couleur, alignement, interligne, **marges liées/déliées** — édités dans l'onglet **Texte**, reflétés en direct.
- L'onglet **Format** règle la **marge de contenu** (liée/déliée, 50 px par défaut) et la **position du bloc** (haut/centre/bas).
- Le moteur de rendu lit ces réglages depuis le document (plus de styles figés) ; le modèle supporte la surcharge de ligne (`override`) pour une UI ultérieure.
- Les documents anciens (sans réglages) sont **normalisés au chargement** (`ensureDocDefaults`).
- Persistance vérifiée ; `npm test` vert ; `npm run build` vert.
- Base prête pour la **Phase 4B (fonds & voile)**.
```
