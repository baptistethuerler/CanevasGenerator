# Atelier de Stories — Phase 4B-1 : Fond couleur & voile · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de choisir un **fond de couleur** par document (avec surcharge par slide) et d'appliquer un **voile** de lisibilité (aucun / uniforme / dégradé), le tout reflété en direct dans l'aperçu via un onglet « Fond ».

**Architecture:** Le moteur de rendu gagne un module de dessin de fond (`drawBackground`) qui peint une couleur puis un voile (uniforme via `fillRect`, dégradé via `createLinearGradient`/`createRadialGradient`). Le modèle porte un `Background` par document et une surcharge optionnelle par slide ; l'éditeur calcule le fond effectif (`slide.background ?? doc.background`) et l'édite dans un nouvel onglet « Fond ».

**Tech Stack:** React 18, TypeScript, Vite, Tailwind + « Sérénité », Canvas 2D, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-07-12-atelier-stories-altitude-design.md` (§6.4 Fond, §9 Fond, §10 Rendu).

**Décomposition de la 4B :** 4B-1 (ce plan) = fond couleur + voile. 4B-2 = banque d'images (upload serveur + chargement asynchrone).

**Portée EXCLUE de la 4B-1 :** images de fond, banque d'images, recadrage/zoom, luminosité, flou (→ 4B-2) · logo (4C) · export (Phase 5). Le champ `Background.kind` prévoit déjà `"image"` pour la 4B-2, mais seule la valeur `"color"` est gérée ici.

**Ordre :** modèle & moteur (purs, testés) d'abord, puis aperçu, puis l'onglet Fond et l'éditeur, enfin la vérification. La tâche « renderer » laisse une rupture de typage transitoire dans `CanvasPreview` (corrigée à la tâche suivante) : on n'y lance donc que Vitest, et `tsc` redevient propre juste après.

---

## Structure de fichiers de cette phase

```
app/src/
├─ lib/
│  ├─ model.ts               ← (MODIFIÉ) Overlay/Background + défauts + effectiveBackground + doc/slide.background
│  ├─ api.ts                 ← (MODIFIÉ) StoryDoc.background optionnel
│  └─ renderer/draw.ts       ← (MODIFIÉ) hexToRgba + drawBackground + drawSlide prend un Background
├─ components/
│  ├─ CanvasPreview.tsx      ← (MODIFIÉ) reçoit et dessine le fond
│  └─ BackgroundInspector.tsx← (NOUVEAU) onglet « Fond » : couleur + voile + portée
└─ pages/
   └─ Editor.tsx             ← (MODIFIÉ) onglet Fond + fond effectif (story/slide)
```

---

## Task 1 : Modèle — fond et voile

**Files:**
- Modify: `app/src/lib/model.ts`
- Test: `app/src/lib/model.test.ts`

- [ ] **Step 1 : Ajouter les tests** au fichier existant `app/src/lib/model.test.ts`. Modifier la ligne d'import :
```ts
import { DEFAULT_STYLES, newLine, newSlide, newStoryPayload, newPostPayload, STYLE_KEYS, mergeStyle, ensureDocDefaults, defaultContentMargin } from "./model";
```
en :
```ts
import { DEFAULT_STYLES, newLine, newSlide, newStoryPayload, newPostPayload, STYLE_KEYS, mergeStyle, ensureDocDefaults, defaultContentMargin, defaultBackground, effectiveBackground } from "./model";
```
Puis ajouter, APRÈS le dernier `describe(...)` du fichier, ce bloc :
```ts
describe("fond & voile", () => {
  it("defaultBackground est une couleur sauge sans voile", () => {
    const bg = defaultBackground();
    expect(bg.kind).toBe("color");
    expect(bg.color).toBe("#4e7a63");
    expect(bg.overlay.type).toBe("none");
  });

  it("newStoryPayload embarque un background par défaut", () => {
    expect(newStoryPayload().background).toEqual(defaultBackground());
  });

  it("ensureDocDefaults ajoute un background si absent", () => {
    const doc = ensureDocDefaults({
      id: "x", type: "story", format: "9:16", title: "T", status: "draft",
      createdAt: "now", updatedAt: "now", slides: [],
    });
    expect(doc.background).toEqual(defaultBackground());
  });

  it("effectiveBackground : la surcharge du slide prime sur celle du document", () => {
    const docBg = defaultBackground();
    const slideBg = { ...defaultBackground(), color: "#c9836a" };
    const doc = { background: docBg } as any;
    expect(effectiveBackground(doc, { id: "s", lines: [], background: slideBg })).toBe(slideBg);
    expect(effectiveBackground(doc, { id: "s", lines: [] })).toBe(docBg);
  });
});
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: FAIL — `defaultBackground`/`effectiveBackground` non exportés ; `background` absent des payloads.

- [ ] **Step 3 : Modifier `app/src/lib/model.ts`.** Effectuer les ajouts suivants (sans rien retirer d'existant) :

**(a)** Après le bloc `export type Align = ...;` (ou à proximité des autres types), ajouter :
```ts
export type OverlayType = "none" | "uniform" | "gradient";
export type OverlayDirection = "bottom" | "top" | "radial";

export interface Overlay {
  type: OverlayType;
  color: string;
  intensity: number;
  direction: OverlayDirection;
  softness: number;
}

export interface Background {
  kind: "color" | "image";
  color: string;
  overlay: Overlay;
}

export const BG_COLOR_CHOICES = ["#4e7a63", "#3f6b54", "#f6f4ee", "#2f3a34", "#c9836a", "#ffffff"];
export const OVERLAY_COLOR_CHOICES = ["#000000", "#2f3a34", "#3f6b54", "#ffffff"];

export function defaultOverlay(): Overlay {
  return { type: "none", color: "#000000", intensity: 0.5, direction: "bottom", softness: 0.5 };
}

export function defaultBackground(): Background {
  return { kind: "color", color: "#4e7a63", overlay: defaultOverlay() };
}
```

**(b)** Dans l'interface `Slide`, ajouter le champ optionnel `background` :
```ts
export interface Slide {
  id: string;
  name?: string;
  lines: Line[];
  background?: Background | null;
}
```

**(c)** Dans l'interface `StoryPayload`, ajouter `background: Background;` (par ex. juste avant `slides`). Dans `DocLike`, ajouter `background?: Background;`. Dans `ResolvedDoc`, ajouter `background: Background;`.

**(d)** Dans `ensureDocDefaults`, ajouter `background: doc.background ?? defaultBackground(),` à l'objet retourné.

**(e)** Dans la fonction `baseNew`, ajouter `background: defaultBackground(),` à l'objet retourné (à côté de `styles`/`contentMargin`).

**(f)** Ajouter la fonction de résolution en fin de fichier :
```ts
export function effectiveBackground(
  doc: { background: Background },
  slide: { background?: Background | null } | null,
): Background {
  return (slide && slide.background) ? slide.background : doc.background;
}
```

- [ ] **Step 4 : Lancer les tests (succès attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/model.ts app/src/lib/model.test.ts
git commit -m "feat(model): fond couleur + voile (Background/Overlay) par document et slide"
```

---

## Task 2 : Moteur — dessin du fond et du voile

**Files:**
- Modify: `app/src/lib/renderer/draw.ts`
- Test: `app/src/lib/renderer/draw.test.ts`

- [ ] **Step 1 : Ajouter les tests.** Dans `app/src/lib/renderer/draw.test.ts` :

Modifier l'import du modèle :
```ts
import { DEFAULT_STYLES, defaultContentMargin } from "../model";
```
en :
```ts
import { DEFAULT_STYLES, defaultContentMargin, defaultBackground } from "../model";
```
Modifier l'import du moteur :
```ts
import { drawSlide, STORY_DIMS, dimsFor, DIMS } from "./draw";
```
en :
```ts
import { drawSlide, STORY_DIMS, dimsFor, DIMS, drawBackground, hexToRgba } from "./draw";
```
Modifier la constante `opts` (le `background` devient un objet) :
```ts
const opts = { dims: STORY_DIMS, background: "#4e7a63", contentMargin: defaultContentMargin(), blockPosition: "center" as const };
```
en :
```ts
const opts = { dims: STORY_DIMS, background: defaultBackground(), contentMargin: defaultContentMargin(), blockPosition: "center" as const };
```
Enrichir la fabrique `fakeCtx()` pour supporter les dégradés (ajouter les 3 méthodes après `measureText`) :
```ts
    measureText: (t: string) => ({ width: String(t).length * 20 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    save: () => {},
    restore: () => {},
    calls,
```
Puis ajouter, à la fin du fichier, ce nouveau bloc :
```ts
describe("hexToRgba", () => {
  it("convertit un hex + alpha", () => {
    expect(hexToRgba("#000000", 0.5)).toBe("rgba(0, 0, 0, 0.5)");
    expect(hexToRgba("#ffffff", 1)).toBe("rgba(255, 255, 255, 1)");
  });
});

describe("drawBackground", () => {
  const dims = { width: 1080, height: 1920, margin: 50 };

  it("peint la couleur (fillRect) sans voile quand overlay=none", () => {
    const ctx = fakeCtx();
    drawBackground(ctx as any, { kind: "color", color: "#4e7a63", overlay: { type: "none", color: "#000", intensity: 0.5, direction: "bottom", softness: 0.5 } }, dims);
    const fills = ctx.calls.filter((c) => c[0] === "fillRect");
    expect(fills).toHaveLength(1); // uniquement la couleur, pas de voile
  });

  it("ajoute un fillRect pour un voile uniforme", () => {
    const ctx = fakeCtx();
    drawBackground(ctx as any, { kind: "color", color: "#4e7a63", overlay: { type: "uniform", color: "#000", intensity: 0.5, direction: "bottom", softness: 0.5 } }, dims);
    expect(ctx.calls.filter((c) => c[0] === "fillRect")).toHaveLength(2); // couleur + voile
  });

  it("crée un dégradé linéaire pour un voile dégradé", () => {
    const ctx = fakeCtx();
    let linear = 0;
    (ctx as any).createLinearGradient = () => { linear++; return { addColorStop: () => {} }; };
    drawBackground(ctx as any, { kind: "color", color: "#4e7a63", overlay: { type: "gradient", color: "#000", intensity: 0.6, direction: "bottom", softness: 0.5 } }, dims);
    expect(linear).toBe(1);
    expect(ctx.calls.filter((c) => c[0] === "fillRect")).toHaveLength(2);
  });
});
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: FAIL — `drawBackground`/`hexToRgba` non exportés et `drawSlide` n'accepte pas encore un `background` objet.

- [ ] **Step 3 : Modifier `app/src/lib/renderer/draw.ts`.**

**(a)** Ajouter les imports de types du modèle. Trouver :
```ts
import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition } from "../model";
```
et remplacer par :
```ts
import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background, Overlay } from "../model";
```

**(b)** Étendre l'interface `DrawCtx` (ajouter les méthodes de dégradé + `save`/`restore`) :
```ts
export interface DrawCtx {
  font: string;
  fillStyle: string | CanvasGradient | CanvasPattern;
  textBaseline: string;
  textAlign: string;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): { addColorStop(offset: number, color: string): void };
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): { addColorStop(offset: number, color: string): void };
}
```

**(c)** Ajouter les fonctions de fond AVANT `drawSlide` :
```ts
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawOverlay(ctx: DrawCtx, ov: Overlay, dims: Dims): void {
  if (ov.type === "none" || ov.intensity <= 0) return;
  const { width, height } = dims;
  const strong = hexToRgba(ov.color, ov.intensity);
  const clear = hexToRgba(ov.color, 0);

  if (ov.type === "uniform") {
    ctx.fillStyle = strong;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  let grad: { addColorStop(offset: number, color: string): void };
  if (ov.direction === "radial") {
    grad = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.7);
    grad.addColorStop(0, clear);
    grad.addColorStop(1, strong);
  } else {
    const coords: [number, number, number, number] = ov.direction === "bottom" ? [0, 0, 0, height] : [0, height, 0, 0];
    grad = ctx.createLinearGradient(coords[0], coords[1], coords[2], coords[3]);
    const start = Math.min(0.98, Math.max(0, 1 - ov.softness));
    grad.addColorStop(0, clear);
    grad.addColorStop(start, clear);
    grad.addColorStop(1, strong);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

export function drawBackground(ctx: DrawCtx, bg: Background, dims: Dims): void {
  ctx.fillStyle = bg.color;
  ctx.fillRect(0, 0, dims.width, dims.height);
  drawOverlay(ctx, bg.overlay, dims);
}
```

**(d)** Modifier la signature et le début de `drawSlide` : le paramètre `background: string` devient `background: Background`, et le remplissage initial passe par `drawBackground`. Trouver :
```ts
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
```
et remplacer par :
```ts
export function drawSlide(
  ctx: DrawCtx,
  slide: Slide,
  styles: Record<LineStyleKey, StyleDef>,
  opts: { dims: Dims; background: Background; contentMargin: ContentMargin; blockPosition: BlockPosition },
): void {
  const { width, height } = opts.dims;
  const cm = opts.contentMargin;

  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, opts.background, opts.dims);
```
(Le reste de `drawSlide` — mise en page et texte — est inchangé.)

- [ ] **Step 4 : Lancer les tests (succès attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit** (ne PAS lancer `tsc` : `CanvasPreview` passe encore une chaîne à `drawSlide` — rupture transitoire corrigée à la Task 3)

```bash
git add app/src/lib/renderer/draw.ts app/src/lib/renderer/draw.test.ts
git commit -m "feat(renderer): drawBackground (couleur + voile uniforme/dégradé)"
```

---

## Task 3 : Aperçu — dessiner le fond

**Files:**
- Modify: `app/src/components/CanvasPreview.tsx` (remplacement complet)

- [ ] **Step 1 : Remplacer entièrement `app/src/components/CanvasPreview.tsx`** par :

```tsx
import { useEffect, useRef } from "react";
import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background } from "@/lib/model";
import { DEFAULT_STYLES, defaultContentMargin, defaultBackground } from "@/lib/model";
import { drawSlide, dimsFor } from "@/lib/renderer/draw";

export function CanvasPreview({
  slide, format, styles, contentMargin, blockPosition, background,
}: {
  slide: Slide | null;
  format: string;
  styles?: Record<LineStyleKey, StyleDef>;
  contentMargin?: ContentMargin;
  blockPosition?: BlockPosition;
  background?: Background;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dims = dimsFor(format);
  const st = styles ?? DEFAULT_STYLES;
  const cm = contentMargin ?? defaultContentMargin();
  const bp = blockPosition ?? "center";
  const bg = background ?? defaultBackground();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      if (slide) {
        drawSlide(ctx, slide, st, { dims, background: bg, contentMargin: cm, blockPosition: bp });
      } else {
        ctx.clearRect(0, 0, dims.width, dims.height);
      }
    });
    return () => { cancelled = true; };
  }, [slide, st, cm, bp, bg, dims.width, dims.height, dims.margin]);

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

- [ ] **Step 2 : Vérifier la compilation** (le projet compile de nouveau intégralement)

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/src/components/CanvasPreview.tsx
git commit -m "feat(preview): dessine le fond (couleur + voile)"
```

---

## Task 4 : Client API — StoryDoc porte le fond

**Files:**
- Modify: `app/src/lib/api.ts`

- [ ] **Step 1 : Mettre à jour l'import de types.** Trouver :
```ts
import type { Slide, StoryPayload, Format, LineStyleKey, StyleDef, ContentMargin, BlockPosition } from "./model";
```
et remplacer par :
```ts
import type { Slide, StoryPayload, Format, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background } from "./model";
```

- [ ] **Step 2 : Ajouter `background` à l'interface `StoryDoc`.** Dans la définition de `StoryDoc`, ajouter (à côté de `styles?`/`contentMargin?`) :
```ts
  background?: Background;
```

- [ ] **Step 3 : Faire suivre `background` dans `duplicateDoc`.** Dans l'objet `payload` construit par `duplicateDoc`, ajouter `background: src.background,` (à côté de `styles`/`contentMargin`/`blockPosition`). Note : `src` est le résultat de `ensureDocDefaults(await getDoc(id))`, donc `src.background` est garanti présent.

- [ ] **Step 4 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/api.ts
git commit -m "feat(api): StoryDoc porte le fond + duplication du fond"
```

---

## Task 5 : Inspecteur « Fond »

**Files:**
- Create: `app/src/components/BackgroundInspector.tsx`

- [ ] **Step 1 : Implémenter `app/src/components/BackgroundInspector.tsx`**

```tsx
import type { Background, Overlay, OverlayType, OverlayDirection } from "@/lib/model";
import { BG_COLOR_CHOICES, OVERLAY_COLOR_CHOICES } from "@/lib/model";

const label: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800, margin: "12px 0 4px" };
const swatch = (c: string, active: boolean): React.CSSProperties => ({ width: 24, height: 24, borderRadius: 6, background: c, cursor: "pointer", border: active ? "2px solid var(--sage)" : "1px solid var(--line)" });
const seg = (active: boolean): React.CSSProperties => ({ flex: 1, padding: "6px 0", fontSize: 12, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", border: active ? "1.5px solid var(--sage)" : "1px solid var(--line)", background: active ? "#e3efe7" : "#fff", color: "var(--ink)" });

export function BackgroundInspector({
  value, onChange, scope, onScopeChange, isSlideOverride, onClearSlide,
}: {
  value: Background;
  onChange: (bg: Background) => void;
  scope: "story" | "slide";
  onScopeChange: (s: "story" | "slide") => void;
  isSlideOverride: boolean;
  onClearSlide: () => void;
}) {
  const setOverlay = (patch: Partial<Overlay>) => onChange({ ...value, overlay: { ...value.overlay, ...patch } });
  const ov = value.overlay;

  return (
    <div style={{ width: 260, borderLeft: "1px solid var(--line)", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto", padding: 12 }}>
      <div style={{ fontWeight: 800, color: "var(--sage-deep)", fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Fond</div>

      <div style={label}>Appliquer à</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" style={seg(scope === "story")} onClick={() => onScopeChange("story")}>Toute la story</button>
        <button type="button" style={seg(scope === "slide")} onClick={() => onScopeChange("slide")}>Ce slide</button>
      </div>
      {scope === "slide" && isSlideOverride && (
        <button type="button" className="btn ghost" style={{ fontSize: 12, marginTop: 6 }} onClick={onClearSlide}>↺ Revenir au fond de la story</button>
      )}

      <div style={label}>Couleur du fond</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
        {BG_COLOR_CHOICES.map((c) => (
          <button key={c} type="button" title={c} style={swatch(c, value.color === c)} onClick={() => onChange({ ...value, color: c })} />
        ))}
        <input type="color" value={value.color.startsWith("#") ? value.color : "#4e7a63"} onChange={(e) => onChange({ ...value, color: e.target.value })} title="Couleur personnalisée" style={{ width: 28, height: 24, border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer", background: "#fff" }} />
      </div>

      <div style={label}>Voile (lisibilité)</div>
      <div style={{ display: "flex", gap: 6 }}>
        {(["none", "uniform", "gradient"] as OverlayType[]).map((t) => (
          <button key={t} type="button" style={seg(ov.type === t)} onClick={() => setOverlay({ type: t })}>
            {t === "none" ? "Aucun" : t === "uniform" ? "Uniforme" : "Dégradé"}
          </button>
        ))}
      </div>

      {ov.type !== "none" && (
        <>
          {ov.type === "gradient" && (
            <>
              <div style={label}>Direction</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["bottom", "top", "radial"] as OverlayDirection[]).map((d) => (
                  <button key={d} type="button" style={seg(ov.direction === d)} onClick={() => setOverlay({ direction: d })}>
                    {d === "bottom" ? "▼ Bas" : d === "top" ? "▲ Haut" : "◉ Radial"}
                  </button>
                ))}
              </div>
              <div style={label}>Douceur</div>
              <input type="range" min={0} max={1} step={0.05} value={ov.softness} onChange={(e) => setOverlay({ softness: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--sage)" }} />
            </>
          )}

          <div style={label}>Intensité — {Math.round(ov.intensity * 100)} %</div>
          <input type="range" min={0} max={1} step={0.05} value={ov.intensity} onChange={(e) => setOverlay({ intensity: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--sage)" }} />

          <div style={label}>Couleur du voile</div>
          <div style={{ display: "flex", gap: 5 }}>
            {OVERLAY_COLOR_CHOICES.map((c) => (
              <button key={c} type="button" title={c} style={swatch(c, ov.color === c)} onClick={() => setOverlay({ color: c })} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/src/components/BackgroundInspector.tsx
git commit -m "feat(editor): inspecteur Fond (couleur + voile + portée story/slide)"
```

---

## Task 6 : Éditeur — onglet Fond

**Files:**
- Modify: `app/src/pages/Editor.tsx`

- [ ] **Step 1 : Modifier `app/src/pages/Editor.tsx`.**

**(a)** Ajouter aux imports du modèle `effectiveBackground, defaultBackground` et le type `Background`. Trouver :
```ts
import {
  newSlide, newLine, uid, ensureDocDefaults,
  type LineStyleKey, type StyleDef, type ContentMargin, type BlockPosition, type ResolvedDoc,
} from "@/lib/model";
```
et remplacer par :
```ts
import {
  newSlide, newLine, uid, ensureDocDefaults, effectiveBackground, defaultBackground,
  type LineStyleKey, type StyleDef, type ContentMargin, type BlockPosition, type ResolvedDoc, type Background,
} from "@/lib/model";
```
Ajouter l'import du composant, à côté des autres inspecteurs :
```ts
import { BackgroundInspector } from "@/components/BackgroundInspector";
```

**(b)** Étendre le type des onglets. Trouver :
```ts
type Tab = "contenu" | "texte" | "format";
```
et remplacer par :
```ts
type Tab = "contenu" | "texte" | "fond" | "format";
```

**(c)** Ajouter un état de portée du fond, juste après `const [tab, setTab] = useState<Tab>("contenu");` :
```ts
  const [bgScope, setBgScope] = useState<"story" | "slide">("story");
```

**(d)** Dans la barre d'onglets, ajouter le bouton « Fond » entre « Texte » et « Format ». Trouver :
```tsx
              {tabBtn("texte", "Texte")}
              {tabBtn("format", "Format")}
```
et remplacer par :
```tsx
              {tabBtn("texte", "Texte")}
              {tabBtn("fond", "Fond")}
              {tabBtn("format", "Format")}
```

**(e)** Passer le fond effectif à l'aperçu. Trouver :
```tsx
            <CanvasPreview slide={slide} format={doc.format} styles={doc.styles} contentMargin={doc.contentMargin} blockPosition={doc.blockPosition} />
```
et remplacer par :
```tsx
            <CanvasPreview slide={slide} format={doc.format} styles={doc.styles} contentMargin={doc.contentMargin} blockPosition={doc.blockPosition} background={effectiveBackground(doc, slide)} />
```

**(f)** Ajouter le panneau « Fond » dans l'inspecteur. Trouver le bloc de l'onglet « format » :
```tsx
              {tab === "format" && (
```
et insérer JUSTE AVANT lui :
```tsx
              {tab === "fond" && (
                <BackgroundInspector
                  scope={bgScope}
                  onScopeChange={setBgScope}
                  value={bgScope === "slide" ? (slide?.background ?? doc.background) : doc.background}
                  isSlideOverride={!!(slide && slide.background)}
                  onClearSlide={() => updateSlide(idx, (s) => ({ ...s, background: null }))}
                  onChange={(bg: Background) => {
                    if (bgScope === "slide") updateSlide(idx, (s) => ({ ...s, background: bg }));
                    else setDoc({ ...doc, background: bg });
                  }}
                />
              )}
```

- [ ] **Step 2 : Build complet (tsc + vite)**

Run: `npm run build`
Expected: succès, aucune erreur TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add app/src/pages/Editor.tsx
git commit -m "feat(editor): onglet Fond (couleur + voile, portée story/slide)"
```

---

## Task 7 : Vérification end-to-end

- [ ] **Step 1 : Suite de tests**

Run: `npm test`
Expected: tous PASS (0 échec). Le décompte augmente de ~7 tests (modèle + rendu du fond).

- [ ] **Step 2 : Vérification navigateur (parcours réel)**

```bash
npm run build
NODE_ENV=production PORT=4321 node server/index.js &
SERVER_PID=$!
sleep 1
```

Sur `http://localhost:4321` (navigateur ou Puppeteer) :
1. Créer une **Story**, ouvrir l'éditeur.
2. Onglet **Fond** : changer la **couleur du fond** (une pastille, ou le sélecteur personnalisé) → l'aperçu change.
3. Passer le **voile** sur **Dégradé**, direction **▼ Bas**, monter l'**intensité** → un dégradé sombre apparaît en bas de l'aperçu (le texte reste lisible).
4. Basculer la portée sur **Ce slide**, choisir une autre couleur → seul le slide courant change ; **↺ Revenir au fond de la story** rétablit.
5. Revenir (←), rouvrir la story → le fond et le voile sont **conservés** (persistance disque). Vérifier aussi la surcharge de slide.

```bash
kill $SERVER_PID
```

- [ ] **Step 3 : Commit** (uniquement si des correctifs ont été nécessaires).

---

## Definition of Done (Phase 4B-1)

- Un **fond de couleur** est réglable au niveau du document, avec **surcharge par slide** ; l'aperçu affiche le fond effectif (`slide.background ?? doc.background`).
- Un **voile** (aucun / uniforme / **dégradé** bas·haut·radial, avec intensité, douceur et couleur) est appliqué et rendu en direct.
- Le moteur dessine fond + voile (`drawBackground`, testé : couleur, uniforme, dégradé).
- Les documents anciens sont normalisés (fond par défaut ajouté au chargement).
- Persistance vérifiée ; `npm test` vert ; `npm run build` vert.
- Base prête pour la **Phase 4B-2 (banque d'images)**.
```
