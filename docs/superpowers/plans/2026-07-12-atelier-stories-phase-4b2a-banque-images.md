# Atelier de Stories — Phase 4B-2a : Banque d'images & fond image · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre d'uploader des images dans une banque (servie sur `/images`), et d'utiliser une image comme **fond** d'un document ou d'un slide (rendu « cover »), avec chargement asynchrone dans l'aperçu.

**Architecture:** Un module serveur `assets` (liste / enregistrement base64 / suppression) exposé par des routes `/api/assets/images`, plus le service statique de `/images`. Le modèle enrichit `Background` (`imageRef`, `crop`, `filters` — ces deux derniers avec valeurs par défaut, exploités dès maintenant par le moteur mais réglables seulement en 4B-2b). Le moteur dessine l'image (cover + recadrage + filtres) ; l'aperçu charge l'image de façon asynchrone. L'inspecteur « Fond » gagne une bascule Couleur/Image et la banque d'images.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind + « Sérénité », Canvas 2D, Node/Express, Vitest + Supertest.

**Reference spec:** `docs/superpowers/specs/2026-07-12-atelier-stories-altitude-design.md` (§3 API assets, §4 dossiers, §6.4 Fond, §9 Fond, §10 Rendu).

**Décomposition de la 4B-2 :** 4B-2a (ce plan) = banque + fond image (cover). 4B-2b = UI de recadrage/zoom/luminosité/flou.

**Portée EXCLUE de la 4B-2a :** UI de recadrage/zoom/point focal, luminosité, flou (→ 4B-2b ; le moteur les applique déjà avec des valeurs par défaut) · logo (4C) · export (Phase 5).

**Ordre :** serveur d'abord (assets + routes, testés), puis modèle & moteur, puis client & aperçu, puis l'inspecteur et l'éditeur, enfin la vérification. Une rupture de typage transitoire dans `CanvasPreview` (paramètre `image` de `drawSlide`) est corrigée à la tâche suivante ; la tâche renderer n'exécute donc que Vitest.

---

## Structure de fichiers de cette phase

```
server/
├─ assets.js                 ← (NOUVEAU) liste / save (base64) / remove d'images
├─ routes/assets.js          ← (NOUVEAU) routes /api/assets/images
├─ app.js                    ← (MODIFIÉ) monte les routes assets + sert /images + limite JSON 50mb
└─ __tests__/assets.test.js  ← (NOUVEAU) tests API assets
app/src/
├─ lib/
│  ├─ model.ts               ← (MODIFIÉ) Background.imageRef + Crop/Filters + défauts
│  ├─ api.ts                 ← (MODIFIÉ) listImages / uploadImage / deleteImage
│  └─ renderer/draw.ts       ← (MODIFIÉ) computeImageRect + fond image dans drawBackground + drawSlide
├─ components/
│  ├─ CanvasPreview.tsx      ← (MODIFIÉ) charge l'image et la passe au moteur
│  └─ BackgroundInspector.tsx← (MODIFIÉ) bascule Couleur/Image + banque d'images
└─ pages/Editor.tsx          ← (MODIFIÉ) état de la banque d'images + câblage
```

---

## Task 1 : Serveur — module `assets`

**Files:**
- Create: `server/assets.js`
- Test: `server/__tests__/assets.test.js` (test du module, sans HTTP)

- [ ] **Step 1 : Écrire le test qui échoue** `server/__tests__/assets.test.js` :

```js
import { describe, it, expect, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { makePaths, ensureDataDirs } from "../paths.js";
import { createAssets } from "../assets.js";

const tmp = join(process.cwd(), ".tmp-test-assets");
afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

// PNG 1x1 transparent (base64) sous forme de data URL.
const PNG_1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function freshAssets() {
  const p = makePaths(tmp);
  await ensureDataDirs(p);
  return createAssets(p);
}

describe("assets", () => {
  it("enregistre une image base64 puis la liste", async () => {
    const a = await freshAssets();
    const saved = await a.save(PNG_1x1);
    expect(saved.ref).toMatch(/\.png$/);
    expect(saved.url).toBe(`/images/${saved.ref}`);
    const list = await a.list();
    expect(list.map((x) => x.ref)).toContain(saved.ref);
  });

  it("refuse une dataUrl invalide", async () => {
    const a = await freshAssets();
    await expect(a.save("pas-une-image")).rejects.toThrow();
  });

  it("supprime une image", async () => {
    const a = await freshAssets();
    const saved = await a.save(PNG_1x1);
    await a.remove(saved.ref);
    expect((await a.list()).map((x) => x.ref)).not.toContain(saved.ref);
  });

  it("refuse un ref contenant un chemin (anti-traversal)", async () => {
    const a = await freshAssets();
    await expect(a.remove("../secret.txt")).rejects.toThrow();
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run server/__tests__/assets.test.js`
Expected: FAIL — `Cannot find module '../assets.js'`.

- [ ] **Step 3 : Implémenter `server/assets.js`**

```js
import { readdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const EXT_BY_MIME = { "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;
const SAFE_REF = /^[a-zA-Z0-9._-]+$/;

export function createAssets(p) {
  return {
    async list() {
      let files = [];
      try { files = await readdir(p.images); } catch { files = []; }
      return files.filter((f) => IMG_RE.test(f)).map((ref) => ({ ref, url: `/images/${ref}` }));
    },
    async save(dataUrl) {
      const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl || "");
      if (!match) throw new Error("dataUrl invalide");
      const ext = EXT_BY_MIME[match[1].toLowerCase()];
      if (!ext) throw new Error("type d'image non supporté");
      const ref = `${randomUUID()}.${ext}`;
      await writeFile(join(p.images, ref), Buffer.from(match[2], "base64"));
      return { ref, url: `/images/${ref}` };
    },
    async remove(ref) {
      if (!SAFE_REF.test(ref)) throw new Error("ref invalide");
      await unlink(join(p.images, ref));
    },
  };
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `npx vitest run server/__tests__/assets.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add server/assets.js server/__tests__/assets.test.js
git commit -m "feat(server): module assets (upload base64 / liste / suppression d'images)"
```

---

## Task 2 : Serveur — routes assets + service /images

**Files:**
- Create: `server/routes/assets.js`
- Modify: `server/app.js`
- Test: `server/__tests__/assets.test.js` (ajouter des tests HTTP)

- [ ] **Step 1 : Ajouter des tests HTTP** au fichier `server/__tests__/assets.test.js`. Ajouter en haut l'import de supertest et de `createApp` :
```js
import request from "supertest";
import { createStore } from "../store.js";
import { createApp } from "../app.js";
```
Puis ajouter, après le `describe("assets", ...)`, ce nouveau bloc :
```js
async function freshApp() {
  const p = makePaths(tmp);
  await ensureDataDirs(p);
  return createApp({ store: createStore(p), paths: p, serveStatic: false });
}

describe("API assets", () => {
  it("POST puis GET liste l'image ; DELETE la retire", async () => {
    const app = await freshApp();
    const post = await request(app).post("/api/assets/images").send({ dataUrl: PNG_1x1 });
    expect(post.status).toBe(201);
    expect(post.body.ref).toMatch(/\.png$/);
    const list = await request(app).get("/api/assets/images");
    expect(list.body.map((x) => x.ref)).toContain(post.body.ref);
    await request(app).delete(`/api/assets/images/${post.body.ref}`).expect(200);
    const after = await request(app).get("/api/assets/images");
    expect(after.body.map((x) => x.ref)).not.toContain(post.body.ref);
  });

  it("POST d'une dataUrl invalide renvoie 400", async () => {
    const app = await freshApp();
    await request(app).post("/api/assets/images").send({ dataUrl: "nope" }).expect(400);
  });
});
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run server/__tests__/assets.test.js`
Expected: FAIL — les routes assets n'existent pas encore (404).

- [ ] **Step 3 : Implémenter `server/routes/assets.js`**

```js
import { Router } from "express";

export function assetsRouter(assets) {
  const r = Router();

  r.get("/assets/images", async (_req, res) => {
    try { res.json(await assets.list()); }
    catch { res.status(500).json({ error: "list failed" }); }
  });

  r.post("/assets/images", async (req, res) => {
    try { res.status(201).json(await assets.save(req.body?.dataUrl)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  r.delete("/assets/images/:ref", async (req, res) => {
    try { await assets.remove(req.params.ref); res.json({ ok: true }); }
    catch { res.status(404).json({ error: "not found" }); }
  });

  return r;
}
```

- [ ] **Step 4 : Câbler dans `server/app.js`.**

(a) Ajouter les imports en haut :
```js
import { assetsRouter } from "./routes/assets.js";
import { createAssets } from "./assets.js";
```

(b) Augmenter la limite du corps JSON (les images arrivent en base64). Trouver :
```js
  app.use(express.json({ limit: "20mb" }));
```
et remplacer par :
```js
  app.use(express.json({ limit: "50mb" }));
  app.use("/images", express.static(paths.images));
```

(c) Monter les routes assets à côté des autres routes `/api`. Trouver :
```js
  app.use("/api", libraryRouter(store));
  app.use("/api", docsRouter(store));
```
et remplacer par :
```js
  app.use("/api", libraryRouter(store));
  app.use("/api", docsRouter(store));
  app.use("/api", assetsRouter(createAssets(paths)));
```

- [ ] **Step 5 : Lancer les tests (succès attendu)**

Run: `npx vitest run server/__tests__/assets.test.js`
Expected: PASS.

- [ ] **Step 6 : Vérifier la non-régression serveur**

Run: `npx vitest run server`
Expected: tous les tests serveur PASS.

- [ ] **Step 7 : Commit**

```bash
git add server/routes/assets.js server/app.js server/__tests__/assets.test.js
git commit -m "feat(server): routes /api/assets/images + service statique /images"
```

---

## Task 3 : Modèle — fond image

**Files:**
- Modify: `app/src/lib/model.ts`
- Test: `app/src/lib/model.test.ts`

- [ ] **Step 1 : Ajouter les tests.** Dans `app/src/lib/model.test.ts`, ajouter à la liste d'import `defaultCrop, defaultFilters` :
```ts
import { DEFAULT_STYLES, newLine, newSlide, newStoryPayload, newPostPayload, STYLE_KEYS, mergeStyle, ensureDocDefaults, defaultContentMargin, defaultBackground, effectiveBackground, defaultCrop, defaultFilters } from "./model";
```
Puis ajouter, à la fin du fichier :
```ts
describe("fond image", () => {
  it("defaultCrop = zoom 1, centré", () => {
    expect(defaultCrop()).toEqual({ zoom: 1, x: 0.5, y: 0.5 });
  });
  it("defaultFilters = neutre", () => {
    expect(defaultFilters()).toEqual({ brightness: 1, blur: 0 });
  });
});
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: FAIL — `defaultCrop`/`defaultFilters` non exportés.

- [ ] **Step 3 : Modifier `app/src/lib/model.ts`.** Trouver l'interface `Background` :
```ts
export interface Background {
  kind: "color" | "image";
  color: string;
  overlay: Overlay;
}
```
et remplacer par :
```ts
export interface Crop {
  zoom: number;
  x: number;
  y: number;
}

export interface Filters {
  brightness: number;
  blur: number;
}

export interface Background {
  kind: "color" | "image";
  color: string;
  imageRef?: string;
  crop?: Crop;
  filters?: Filters;
  overlay: Overlay;
}

export function defaultCrop(): Crop {
  return { zoom: 1, x: 0.5, y: 0.5 };
}

export function defaultFilters(): Filters {
  return { brightness: 1, blur: 0 };
}
```

- [ ] **Step 4 : Lancer les tests (succès attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/model.ts app/src/lib/model.test.ts
git commit -m "feat(model): fond image (imageRef + crop + filters) avec défauts"
```

---

## Task 4 : Moteur — rendu du fond image

**Files:**
- Modify: `app/src/lib/renderer/draw.ts`
- Test: `app/src/lib/renderer/draw.test.ts`

- [ ] **Step 1 : Ajouter les tests.** Dans `app/src/lib/renderer/draw.test.ts` :

Enrichir `fakeCtx()` : ajouter `drawImage` et `filter` (après les gradients). Trouver :
```ts
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    save: () => {},
    restore: () => {},
    calls,
```
et remplacer par :
```ts
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    drawImage: (...a: any[]) => calls.push(["drawImage", ...a]),
    filter: "none",
    save: () => {},
    restore: () => {},
    calls,
```
Modifier l'import du moteur pour inclure `computeImageRect` :
```ts
import { drawSlide, STORY_DIMS, dimsFor, DIMS, drawBackground, hexToRgba } from "./draw";
```
en :
```ts
import { drawSlide, STORY_DIMS, dimsFor, DIMS, drawBackground, hexToRgba, computeImageRect } from "./draw";
```
Puis ajouter, à la fin du fichier :
```ts
describe("computeImageRect (cover + zoom + focal)", () => {
  it("couvre entièrement le canvas", () => {
    const r = computeImageRect(1080, 1920, 1080, 1080, { zoom: 1, x: 0.5, y: 0.5 });
    expect(r.dw).toBeGreaterThanOrEqual(1080);
    expect(r.dh).toBeGreaterThanOrEqual(1920);
  });
  it("centre l'image quand le point focal est au milieu", () => {
    const r = computeImageRect(1080, 1920, 1080, 1080, { zoom: 1, x: 0.5, y: 0.5 });
    expect(r.dx).toBeCloseTo((1080 - r.dw) / 2, 5);
  });
});

describe("drawBackground image", () => {
  const dims = { width: 1080, height: 1920, margin: 50 };
  const img = { width: 1080, height: 1080 };

  it("dessine l'image quand kind=image et image fournie (pas de fillRect de couleur)", () => {
    const ctx = fakeCtx();
    const bg = { kind: "image" as const, color: "#4e7a63", imageRef: "a.png", overlay: { type: "none" as const, color: "#000", intensity: 0.5, direction: "bottom" as const, softness: 0.5 } };
    drawBackground(ctx as any, bg, dims, img as any);
    expect(ctx.calls.some((c) => c[0] === "drawImage")).toBe(true);
    expect(ctx.calls.filter((c) => c[0] === "fillRect")).toHaveLength(0);
  });

  it("retombe sur la couleur si l'image n'est pas encore chargée", () => {
    const ctx = fakeCtx();
    const bg = { kind: "image" as const, color: "#4e7a63", imageRef: "a.png", overlay: { type: "none" as const, color: "#000", intensity: 0.5, direction: "bottom" as const, softness: 0.5 } };
    drawBackground(ctx as any, bg, dims, undefined);
    expect(ctx.calls.some((c) => c[0] === "drawImage")).toBe(false);
    expect(ctx.calls.filter((c) => c[0] === "fillRect")).toHaveLength(1);
  });
});
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: FAIL — `computeImageRect` non exporté et `drawBackground` n'a pas de 4ᵉ paramètre `image`.

- [ ] **Step 3 : Modifier `app/src/lib/renderer/draw.ts`.**

(a) Étendre l'import de types du modèle. Trouver :
```ts
import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background, Overlay } from "../model";
```
et remplacer par :
```ts
import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background, Overlay, Crop } from "../model";
```

(b) Étendre `DrawCtx` — ajouter `drawImage` et `filter`. Dans l'interface `DrawCtx`, ajouter ces deux membres (par ex. après `measureText`) :
```ts
  filter: string;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
```

(c) Ajouter `computeImageRect` et une interface `ImageLike`, juste avant `drawBackground` :
```ts
export interface ImageLike {
  width: number;
  height: number;
}

export function computeImageRect(
  W: number, H: number, iw: number, ih: number, crop: Crop,
): { dx: number; dy: number; dw: number; dh: number } {
  const cover = Math.max(W / iw, H / ih);
  const scale = cover * (crop.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (W - dw) * (crop.x ?? 0.5);
  const dy = (H - dh) * (crop.y ?? 0.5);
  return { dx, dy, dw, dh };
}
```

(d) Remplacer la fonction `drawBackground` par une version qui dessine l'image si disponible :
```ts
export function drawBackground(ctx: DrawCtx, bg: Background, dims: Dims, image?: ImageLike | null): void {
  const { width, height } = dims;
  if (bg.kind === "image" && bg.imageRef && image) {
    const crop = bg.crop ?? { zoom: 1, x: 0.5, y: 0.5 };
    const f = bg.filters ?? { brightness: 1, blur: 0 };
    const { dx, dy, dw, dh } = computeImageRect(width, height, image.width, image.height, crop);
    ctx.save();
    ctx.filter = `brightness(${f.brightness}) blur(${f.blur}px)`;
    ctx.drawImage(image, dx, dy, dw, dh);
    ctx.restore();
    ctx.filter = "none";
  } else {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
  }
  drawOverlay(ctx, bg.overlay, dims);
}
```

(e) Faire passer l'image à travers `drawSlide`. Trouver la signature et l'appel à `drawBackground` :
```ts
  opts: { dims: Dims; background: Background; contentMargin: ContentMargin; blockPosition: BlockPosition },
): void {
  const { width, height } = opts.dims;
  const cm = opts.contentMargin;

  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, opts.background, opts.dims);
```
et remplacer par :
```ts
  opts: { dims: Dims; background: Background; contentMargin: ContentMargin; blockPosition: BlockPosition; image?: ImageLike | null },
): void {
  const { width, height } = opts.dims;
  const cm = opts.contentMargin;

  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, opts.background, opts.dims, opts.image);
```

- [ ] **Step 4 : Lancer les tests (succès attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit** (ne PAS lancer `tsc` : `CanvasPreview` n'envoie pas encore d'`image` — rupture transitoire corrigée à la Task 6 ; ici `drawSlide.opts.image` est optionnel donc la seule différence de type restera l'usage réel dans CanvasPreview)

```bash
git add app/src/lib/renderer/draw.ts app/src/lib/renderer/draw.test.ts
git commit -m "feat(renderer): fond image (cover + zoom/focal + filtres)"
```

---

## Task 5 : Client API — banque d'images

**Files:**
- Modify: `app/src/lib/api.ts`

- [ ] **Step 1 : Ajouter à la fin de `app/src/lib/api.ts`** :

```ts
export interface ImageAsset {
  ref: string;
  url: string;
}

export async function listImages(): Promise<ImageAsset[]> {
  const res = await fetch("/api/assets/images");
  if (!res.ok) throw new Error("Chargement des images impossible");
  return res.json();
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Lecture du fichier impossible"));
    r.readAsDataURL(file);
  });
}

export async function uploadImage(file: File): Promise<ImageAsset> {
  const dataUrl = await fileToDataUrl(file);
  const res = await fetch("/api/assets/images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) throw new Error("Upload de l'image impossible");
  return res.json();
}

export async function deleteImage(ref: string): Promise<void> {
  const res = await fetch(`/api/assets/images/${ref}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Suppression de l'image impossible");
}
```

- [ ] **Step 2 : Vérifier la compilation** (rappel : `draw.ts` a changé mais `CanvasPreview` reste valide car `drawSlide.opts.image` est optionnel)

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/src/lib/api.ts
git commit -m "feat(api): banque d'images (listImages/uploadImage/deleteImage)"
```

---

## Task 6 : Aperçu — chargement asynchrone de l'image

**Files:**
- Modify: `app/src/components/CanvasPreview.tsx` (remplacement complet)

- [ ] **Step 1 : Remplacer entièrement `app/src/components/CanvasPreview.tsx`** par :

```tsx
import { useEffect, useRef, useState } from "react";
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

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const wantImage = bg.kind === "image" && !!bg.imageRef;

  // Charge l'image de fond quand la référence change.
  useEffect(() => {
    if (!wantImage) { setImg(null); return; }
    const image = new Image();
    let cancelled = false;
    image.onload = () => { if (!cancelled) setImg(image); };
    image.onerror = () => { if (!cancelled) setImg(null); };
    image.src = `/images/${bg.imageRef}`;
    return () => { cancelled = true; };
  }, [wantImage, bg.imageRef]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      if (slide) {
        drawSlide(ctx, slide, st, { dims, background: bg, contentMargin: cm, blockPosition: bp, image: img });
      } else {
        ctx.clearRect(0, 0, dims.width, dims.height);
      }
    });
    return () => { cancelled = true; };
  }, [slide, st, cm, bp, bg, img, dims.width, dims.height, dims.margin]);

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
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/src/components/CanvasPreview.tsx
git commit -m "feat(preview): chargement asynchrone de l'image de fond"
```

---

## Task 7 : Inspecteur Fond — bascule Couleur/Image + banque

**Files:**
- Modify: `app/src/components/BackgroundInspector.tsx`

- [ ] **Step 1 : Modifier `app/src/components/BackgroundInspector.tsx`.**

(a) Mettre à jour les imports en tête du fichier :
```ts
import type { Background, Overlay, OverlayType, OverlayDirection } from "@/lib/model";
import { BG_COLOR_CHOICES, OVERLAY_COLOR_CHOICES } from "@/lib/model";
```
en :
```ts
import { useRef } from "react";
import type { Background, Overlay, OverlayType, OverlayDirection } from "@/lib/model";
import { BG_COLOR_CHOICES, OVERLAY_COLOR_CHOICES, defaultCrop, defaultFilters } from "@/lib/model";
import type { ImageAsset } from "@/lib/api";
```

(b) Étendre les props du composant. Trouver :
```tsx
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
```
et remplacer par :
```tsx
export function BackgroundInspector({
  value, onChange, scope, onScopeChange, isSlideOverride, onClearSlide,
  images, onUpload, onDeleteImage,
}: {
  value: Background;
  onChange: (bg: Background) => void;
  scope: "story" | "slide";
  onScopeChange: (s: "story" | "slide") => void;
  isSlideOverride: boolean;
  onClearSlide: () => void;
  images: ImageAsset[];
  onUpload: (file: File) => void;
  onDeleteImage: (ref: string) => void;
}) {
  const setOverlay = (patch: Partial<Overlay>) => onChange({ ...value, overlay: { ...value.overlay, ...patch } });
  const ov = value.overlay;
  const fileRef = useRef<HTMLInputElement>(null);
  const selectImage = (ref: string) => onChange({ ...value, kind: "image", imageRef: ref, crop: value.crop ?? defaultCrop(), filters: value.filters ?? defaultFilters() });
```

(c) Ajouter la bascule Couleur/Image et la banque, JUSTE APRÈS le bloc de portée (le bloc qui se termine par le bouton `↺ Revenir au fond de la story` et son `)}`), c'est-à-dire immédiatement avant `<div style={label}>Couleur du fond</div>`. Insérer :
```tsx
      <div style={label}>Type de fond</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" style={seg(value.kind === "color")} onClick={() => onChange({ ...value, kind: "color" })}>🎨 Couleur</button>
        <button type="button" style={seg(value.kind === "image")} onClick={() => onChange({ ...value, kind: "image", crop: value.crop ?? defaultCrop(), filters: value.filters ?? defaultFilters() })}>🖼️ Image</button>
      </div>

      {value.kind === "image" && (
        <>
          <div style={label}>Banque d'images</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {images.map((im) => (
              <div key={im.ref} style={{ position: "relative" }}>
                <button type="button" onClick={() => selectImage(im.ref)} title="Utiliser cette image"
                  style={{ width: "100%", aspectRatio: "1", borderRadius: 8, backgroundImage: `url(${im.url})`, backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer", border: value.imageRef === im.ref ? "2px solid var(--sage)" : "1px solid var(--line)" }} />
                <button type="button" title="Supprimer" onClick={() => onDeleteImage(im.ref)}
                  style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: 5, border: "none", background: "rgba(0,0,0,.5)", color: "#fff", fontSize: 10, cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()} title="Ajouter une image"
              style={{ aspectRatio: "1", borderRadius: 8, border: "1.5px dashed var(--sage-light)", background: "#f4faf8", color: "var(--sage-deep)", cursor: "pointer", fontSize: 20 }}>＋</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Le recadrage, la luminosité et le flou arriveront à l'étape suivante.</div>
        </>
      )}
```

> Les blocs existants **« Couleur du fond »** et **« Voile »** restent inchangés, en dessous de l'insertion. (Ils s'appliquent quel que soit le type de fond : la couleur sert de repli tant qu'aucune image n'est sélectionnée, et le voile se superpose au fond image.)

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur (le composant n'est pas encore appelé avec les nouvelles props ; l'éditeur les fournit à la Task 8 — mais comme l'ancien appel omet `images`/`onUpload`/`onDeleteImage`, une erreur pointant UNIQUEMENT vers `Editor.tsx` est attendue ici).

> Comme les 3 nouvelles props sont **obligatoires**, `tsc` signalera l'appel incomplet dans `Editor.tsx`. C'est attendu et corrigé à la Task 8. Vérifier que l'erreur ne concerne QUE `Editor.tsx` :
> `npx tsc --noEmit 2>&1 | grep -v "Editor.tsx" | grep "error" || echo "seul Editor.tsx est concerné"`
> Expected : `seul Editor.tsx est concerné`.

- [ ] **Step 3 : Commit**

```bash
git add app/src/components/BackgroundInspector.tsx
git commit -m "feat(editor): inspecteur Fond — bascule Couleur/Image + banque d'images"
```

---

## Task 8 : Éditeur — état de la banque + câblage

**Files:**
- Modify: `app/src/pages/Editor.tsx`

- [ ] **Step 1 : Modifier `app/src/pages/Editor.tsx`.**

(a) Étendre l'import de l'API. Trouver :
```ts
import { getDoc, updateDoc } from "@/lib/api";
```
et remplacer par :
```ts
import { getDoc, updateDoc, listImages, uploadImage, deleteImage, type ImageAsset } from "@/lib/api";
```

(b) Ajouter l'état et le chargement de la banque, juste après la ligne `const [bgScope, setBgScope] = useState<"story" | "slide">("story");` :
```ts
  const [images, setImages] = useState<ImageAsset[]>([]);
  const refreshImages = () => listImages().then(setImages).catch(() => {});
  useEffect(() => { refreshImages(); }, []);
```

(c) Passer les nouvelles props au `BackgroundInspector`. Trouver l'appel existant :
```tsx
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
```
et remplacer par :
```tsx
                <BackgroundInspector
                  scope={bgScope}
                  onScopeChange={setBgScope}
                  value={bgScope === "slide" ? (slide?.background ?? doc.background) : doc.background}
                  isSlideOverride={!!(slide && slide.background)}
                  onClearSlide={() => updateSlide(idx, (s) => ({ ...s, background: null }))}
                  images={images}
                  onUpload={(file) => uploadImage(file).then(refreshImages).catch((e) => setError((e as Error).message))}
                  onDeleteImage={(ref) => deleteImage(ref).then(refreshImages).catch(() => {})}
                  onChange={(bg: Background) => {
                    if (bgScope === "slide") updateSlide(idx, (s) => ({ ...s, background: bg }));
                    else setDoc({ ...doc, background: bg });
                  }}
                />
```

- [ ] **Step 2 : Build complet (tsc + vite)**

Run: `npm run build`
Expected: succès, aucune erreur TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add app/src/pages/Editor.tsx
git commit -m "feat(editor): banque d'images branchée à l'inspecteur Fond"
```

---

## Task 9 : Vérification end-to-end

- [ ] **Step 1 : Suite de tests**

Run: `npm test`
Expected: tous PASS (0 échec). Le décompte augmente (assets serveur + model + renderer image).

- [ ] **Step 2 : Vérification serveur (upload réel)**

```bash
npm run build
NODE_ENV=production PORT=4321 node server/index.js &
SERVER_PID=$!
sleep 1
```
Uploader une image via l'API, la lister, puis vérifier le service statique :
```bash
node -e "const d='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='; fetch('http://localhost:4321/api/assets/images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataUrl:d})}).then(r=>r.json()).then(a=>{console.log('upload:',JSON.stringify(a)); return fetch('http://localhost:4321'+a.url).then(r=>console.log('GET',a.url,'->',r.status));})"
ls images/
```
Expected : `upload: {ref, url}`, le `GET /images/<ref>` renvoie `200`, et un fichier apparaît dans `images/`.

- [ ] **Step 3 : Vérification navigateur (parcours réel)**

Sur `http://localhost:4321` : créer une Story → onglet **Fond** → bascule **🖼️ Image** → **＋** (choisir une image de ton disque) → la vignette apparaît dans la banque → cliquer dessus → l'aperçu affiche l'image en fond (cover), le voile se superpose si activé. Revenir puis rouvrir → l'`imageRef` est conservée (persistance).

```bash
kill $SERVER_PID
```

- [ ] **Step 4 : Nettoyage** — supprimer l'image de test uploadée (dossier `images/` est ignoré par git, mais on nettoie l'état local) :
```bash
rm -f images/*.png
```

- [ ] **Step 5 : Commit** (uniquement si des correctifs ont été nécessaires).

---

## Definition of Done (Phase 4B-2a)

- **Banque d'images** côté serveur : upload (base64 → fichier), liste, suppression ; service statique `/images` ; anti-traversal sur `remove`. Testé (module + API).
- Un **fond image** est sélectionnable depuis l'inspecteur « Fond » (bascule Couleur/Image + banque avec upload/suppression), rendu en **cover** dans l'aperçu (chargement asynchrone).
- Le moteur applique déjà recadrage/zoom/focal et luminosité/flou (valeurs par défaut) — l'UI de réglage viendra en **4B-2b**.
- Le fond image (`imageRef`) est persisté par document/slide.
- `npm test` vert ; `npm run build` vert.
- Base prête pour la **Phase 4B-2b (ajustements d'image : recadrage/zoom/luminosité/flou)**.

