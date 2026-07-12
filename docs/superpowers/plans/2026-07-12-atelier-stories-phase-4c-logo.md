# Atelier de Stories — Phase 4C : Logo · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre d'uploader des logos (banque), et d'en placer un sur les visuels à une ou plusieurs positions (grille de 9 ancrages) ou en position libre, avec taille et opacité, par document (avec surcharge par slide).

**Architecture:** On généralise le module `assets` du serveur à un dossier quelconque (images ET logos) et on ajoute les routes `/api/assets/logos` + le service statique `/logos`. Le modèle porte des placements de logo (`LogoPlacement[]`) par document, avec surcharge par slide. Le moteur dessine les logos (par ancrage ou position libre, taille en fraction de largeur, opacité) par-dessus le texte. L'aperçu charge les images de logo de façon asynchrone. Un onglet « Logo » gère la banque + le placement.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind + « Sérénité », Canvas 2D, Node/Express, Vitest + Supertest.

**Reference spec:** `docs/superpowers/specs/2026-07-12-atelier-stories-altitude-design.md` (§6.5 Logo, §9 Logo, §10 Rendu).

**Portée EXCLUE de la 4C :** ajustements d'image de fond (4B-2b) · export (Phase 5) · glisser-déposer du logo sur l'aperçu (la position libre se règle par curseurs x/y ; le drag viendra éventuellement plus tard).

**Ordre :** serveur, modèle, moteur (purs, testés) d'abord, puis client & aperçu, puis l'inspecteur et l'éditeur, enfin la vérification. Les nouvelles props/opts sont optionnelles → le projet compile à chaque étape (aucune rupture transitoire).

---

## Structure de fichiers de cette phase

```
server/
├─ assets.js                 ← (MODIFIÉ) createAssets(dir, urlBase) — générique
├─ routes/assets.js          ← (MODIFIÉ) assetsRouter(assets, resource)
├─ app.js                    ← (MODIFIÉ) monte images + logos + sert /logos
└─ __tests__/assets.test.js  ← (MODIFIÉ) signature + tests logos
app/src/
├─ lib/
│  ├─ model.ts               ← (MODIFIÉ) LogoPlacement, Anchor, doc/slide.logos, effectiveLogos, newLogoPlacement
│  ├─ api.ts                 ← (MODIFIÉ) listLogos/uploadLogo/deleteLogo + StoryDoc.logos
│  └─ renderer/draw.ts       ← (MODIFIÉ) computeLogoRect + drawLogos + drawSlide.logos/logoImages + globalAlpha
├─ components/
│  ├─ CanvasPreview.tsx      ← (MODIFIÉ) charge les images de logo + les passe au moteur
│  └─ LogoInspector.tsx      ← (NOUVEAU) onglet Logo : banque + ancrages + libre + taille + opacité
└─ pages/Editor.tsx          ← (MODIFIÉ) onglet Logo + état banque de logos + câblage
```

---

## Task 1 : Serveur — assets génériques + banque de logos

**Files:**
- Modify: `server/assets.js`
- Modify: `server/routes/assets.js`
- Modify: `server/app.js`
- Test: `server/__tests__/assets.test.js`

- [ ] **Step 1 : Adapter les tests existants + ajouter les tests logos.** Dans `server/__tests__/assets.test.js` :

Remplacer la fonction `freshAssets` (qui appelle `createAssets(p)`) pour utiliser la nouvelle signature. Trouver :
```js
async function freshAssets() {
  const p = makePaths(tmp);
  await ensureDataDirs(p);
  return createAssets(p);
}
```
et remplacer par :
```js
async function freshAssets() {
  const p = makePaths(tmp);
  await ensureDataDirs(p);
  return createAssets(p.images, "/images");
}
```
Puis ajouter, à la fin du fichier, un bloc pour la banque de logos (réutilise `freshApp` déjà défini) :
```js
describe("API assets — logos", () => {
  it("POST puis GET liste le logo ; DELETE le retire", async () => {
    const app = await freshApp();
    const post = await request(app).post("/api/assets/logos").send({ dataUrl: PNG_1x1 });
    expect(post.status).toBe(201);
    expect(post.body.url).toBe(`/logos/${post.body.ref}`);
    const list = await request(app).get("/api/assets/logos");
    expect(list.body.map((x) => x.ref)).toContain(post.body.ref);
    await request(app).delete(`/api/assets/logos/${post.body.ref}`).expect(200);
  });
});
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run server/__tests__/assets.test.js`
Expected: FAIL — `createAssets` a changé de signature et les routes `/logos` n'existent pas.

- [ ] **Step 3 : Généraliser `server/assets.js`.** Remplacer la fonction `createAssets` :
```js
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
par :
```js
export function createAssets(dir, urlBase) {
  return {
    async list() {
      let files = [];
      try { files = await readdir(dir); } catch { files = []; }
      return files.filter((f) => IMG_RE.test(f)).map((ref) => ({ ref, url: `${urlBase}/${ref}` }));
    },
    async save(dataUrl) {
      const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl || "");
      if (!match) throw new Error("dataUrl invalide");
      const ext = EXT_BY_MIME[match[1].toLowerCase()];
      if (!ext) throw new Error("type d'image non supporté");
      const ref = `${randomUUID()}.${ext}`;
      await writeFile(join(dir, ref), Buffer.from(match[2], "base64"));
      return { ref, url: `${urlBase}/${ref}` };
    },
    async remove(ref) {
      if (!SAFE_REF.test(ref)) throw new Error("ref invalide");
      await unlink(join(dir, ref));
    },
  };
}
```

- [ ] **Step 4 : Généraliser `server/routes/assets.js`.** Remplacer entièrement par :
```js
import { Router } from "express";

export function assetsRouter(assets, resource) {
  const r = Router();

  r.get(`/assets/${resource}`, async (_req, res) => {
    try { res.json(await assets.list()); }
    catch { res.status(500).json({ error: "list failed" }); }
  });

  r.post(`/assets/${resource}`, async (req, res) => {
    try { res.status(201).json(await assets.save(req.body?.dataUrl)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  r.delete(`/assets/${resource}/:ref`, async (req, res) => {
    try { await assets.remove(req.params.ref); res.json({ ok: true }); }
    catch { res.status(404).json({ error: "not found" }); }
  });

  return r;
}
```

- [ ] **Step 5 : Câbler dans `server/app.js`.**

(a) Trouver :
```js
  app.use(express.json({ limit: "50mb" }));
  app.use("/images", express.static(paths.images));
```
et remplacer par :
```js
  app.use(express.json({ limit: "50mb" }));
  app.use("/images", express.static(paths.images));
  app.use("/logos", express.static(paths.logos));
```

(b) Trouver :
```js
  app.use("/api", assetsRouter(createAssets(paths)));
```
et remplacer par :
```js
  app.use("/api", assetsRouter(createAssets(paths.images, "/images"), "images"));
  app.use("/api", assetsRouter(createAssets(paths.logos, "/logos"), "logos"));
```

(c) Exclure `/logos` du fallback SPA. Trouver :
```js
    app.get(/^(?!\/(api|images)).*/, (_req, res) => res.sendFile(join(dist, "index.html")));
```
et remplacer par :
```js
    app.get(/^(?!\/(api|images|logos)).*/, (_req, res) => res.sendFile(join(dist, "index.html")));
```

- [ ] **Step 6 : Lancer les tests (succès attendu)**

Run: `npx vitest run server`
Expected: tous les tests serveur PASS (images + logos).

- [ ] **Step 7 : Commit**

```bash
git add server/assets.js server/routes/assets.js server/app.js server/__tests__/assets.test.js
git commit -m "feat(server): assets génériques + banque de logos (/api/assets/logos, /logos)"
```

---

## Task 2 : Modèle — placement de logo

**Files:**
- Modify: `app/src/lib/model.ts`
- Test: `app/src/lib/model.test.ts`

- [ ] **Step 1 : Ajouter les tests.** Dans `app/src/lib/model.test.ts`, ajouter à l'import depuis `./model` : `newLogoPlacement, effectiveLogos, ANCHORS`. Puis ajouter à la fin :
```ts
describe("logo", () => {
  it("ANCHORS contient les 9 positions", () => {
    expect(ANCHORS).toHaveLength(9);
    expect(ANCHORS).toContain("top-left");
    expect(ANCHORS).toContain("center");
    expect(ANCHORS).toContain("bottom-right");
  });
  it("newLogoPlacement : un ancrage bas-droite, taille et opacité par défaut", () => {
    const p = newLogoPlacement("logo.png");
    expect(p.id).toBeTruthy();
    expect(p.logoRef).toBe("logo.png");
    expect(p.anchors).toEqual(["bottom-right"]);
    expect(p.size).toBeGreaterThan(0);
    expect(p.opacity).toBeGreaterThan(0);
  });
  it("effectiveLogos : la surcharge du slide prime, sinon le document, sinon []", () => {
    const docLogos = [newLogoPlacement("a.png")];
    const slideLogos = [newLogoPlacement("b.png")];
    expect(effectiveLogos({ logos: docLogos }, { id: "s", lines: [], logos: slideLogos })).toBe(slideLogos);
    expect(effectiveLogos({ logos: docLogos }, { id: "s", lines: [] })).toBe(docLogos);
    expect(effectiveLogos({}, null)).toEqual([]);
  });
});
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: FAIL — `newLogoPlacement`/`effectiveLogos`/`ANCHORS` non exportés.

- [ ] **Step 3 : Modifier `app/src/lib/model.ts`.**

(a) Ajouter, près des autres types (par ex. après le bloc `Background`/`Filters`) :
```ts
export type Anchor =
  | "top-left" | "top" | "top-right"
  | "left" | "center" | "right"
  | "bottom-left" | "bottom" | "bottom-right";

export const ANCHORS: Anchor[] = [
  "top-left", "top", "top-right",
  "left", "center", "right",
  "bottom-left", "bottom", "bottom-right",
];

export interface LogoPlacement {
  id: string;
  logoRef: string;
  anchors: Anchor[];
  free?: { x: number; y: number } | null;
  size: number;
  opacity: number;
}

export function newLogoPlacement(logoRef: string): LogoPlacement {
  return { id: uid(), logoRef, anchors: ["bottom-right"], free: null, size: 0.12, opacity: 0.9 };
}

export function effectiveLogos(
  doc: { logos?: LogoPlacement[] },
  slide: Slide | null,
): LogoPlacement[] {
  if (slide && slide.logos) return slide.logos;
  return doc.logos ?? [];
}
```

(b) Dans l'interface `Slide`, ajouter `logos?: LogoPlacement[] | null;`.

(c) Dans `StoryPayload`, ajouter `logos: LogoPlacement[];`. Dans `DocLike`, ajouter `logos?: LogoPlacement[];`. Dans `ResolvedDoc`, ajouter `logos: LogoPlacement[];`.

(d) Dans `ensureDocDefaults`, ajouter au retour : `logos: doc.logos ?? [],`.

(e) Dans `baseNew`, ajouter au retour : `logos: [],`.

- [ ] **Step 4 : Lancer les tests (succès attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/model.ts app/src/lib/model.test.ts
git commit -m "feat(model): placements de logo (ancrages/libre/taille/opacité) par document et slide"
```

---

## Task 3 : Moteur — dessin des logos

**Files:**
- Modify: `app/src/lib/renderer/draw.ts`
- Test: `app/src/lib/renderer/draw.test.ts`

- [ ] **Step 1 : Ajouter les tests.** Dans `app/src/lib/renderer/draw.test.ts` :

Ajouter `globalAlpha` à `fakeCtx()`. Trouver :
```ts
    drawImage: (...a: any[]) => calls.push(["drawImage", ...a]),
    filter: "none",
```
et remplacer par :
```ts
    drawImage: (...a: any[]) => calls.push(["drawImage", ...a]),
    filter: "none",
    globalAlpha: 1,
```
Ajouter `computeLogoRect, drawLogos` à l'import du moteur. Puis ajouter à la fin :
```ts
describe("computeLogoRect", () => {
  const dims = { width: 1080, height: 1920, margin: 50 };
  it("bas-droite : logo collé en bas à droite (avec padding)", () => {
    const r = computeLogoRect(dims.width, dims.height, 100, 100, "bottom-right", 0.1, 50);
    expect(r.dw).toBeCloseTo(108, 5); // 1080 * 0.1
    expect(r.dx).toBeCloseTo(1080 - 50 - r.dw, 5);
    expect(r.dy).toBeCloseTo(1920 - 50 - r.dh, 5);
  });
  it("haut-gauche : logo au padding", () => {
    const r = computeLogoRect(dims.width, dims.height, 100, 100, "top-left", 0.1, 50);
    expect(r.dx).toBe(50);
    expect(r.dy).toBe(50);
  });
});

describe("drawLogos", () => {
  const dims = { width: 1080, height: 1920, margin: 50 };
  const img = { width: 100, height: 100 };

  it("dessine le logo une fois par ancrage", () => {
    const ctx = fakeCtx();
    const logos = [{ id: "1", logoRef: "a.png", anchors: ["top-left", "bottom-right"] as const, free: null, size: 0.1, opacity: 0.9 }];
    drawLogos(ctx as any, logos as any, dims, { "a.png": img } as any, 50);
    expect(ctx.calls.filter((c) => c[0] === "drawImage")).toHaveLength(2);
  });

  it("ignore un logo dont l'image n'est pas chargée", () => {
    const ctx = fakeCtx();
    const logos = [{ id: "1", logoRef: "a.png", anchors: ["center"] as const, free: null, size: 0.1, opacity: 1 }];
    drawLogos(ctx as any, logos as any, dims, {} as any, 50);
    expect(ctx.calls.some((c) => c[0] === "drawImage")).toBe(false);
  });

  it("dessine une fois en position libre", () => {
    const ctx = fakeCtx();
    const logos = [{ id: "1", logoRef: "a.png", anchors: [] as const, free: { x: 0.5, y: 0.5 }, size: 0.1, opacity: 1 }];
    drawLogos(ctx as any, logos as any, dims, { "a.png": img } as any, 50);
    expect(ctx.calls.filter((c) => c[0] === "drawImage")).toHaveLength(1);
  });
});
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: FAIL — `computeLogoRect`/`drawLogos` non exportés.

- [ ] **Step 3 : Modifier `app/src/lib/renderer/draw.ts`.**

(a) Étendre l'import de types. Trouver :
```ts
import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background, Overlay, Crop } from "../model";
```
et remplacer par :
```ts
import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background, Overlay, Crop, LogoPlacement, Anchor } from "../model";
```

(b) Ajouter `globalAlpha` à `DrawCtx` (après `filter`) :
```ts
  globalAlpha: number;
```

(c) Ajouter, APRÈS la fonction `drawBackground` (et avant `drawSlide`) :
```ts
export function computeLogoRect(
  W: number, H: number, iw: number, ih: number, anchor: Anchor, sizeFrac: number, padding: number,
): { dx: number; dy: number; dw: number; dh: number } {
  const dw = W * sizeFrac;
  const dh = dw * (ih / iw);
  let dx: number;
  if (anchor === "top-left" || anchor === "left" || anchor === "bottom-left") dx = padding;
  else if (anchor === "top-right" || anchor === "right" || anchor === "bottom-right") dx = W - padding - dw;
  else dx = (W - dw) / 2;
  let dy: number;
  if (anchor === "top-left" || anchor === "top" || anchor === "top-right") dy = padding;
  else if (anchor === "bottom-left" || anchor === "bottom" || anchor === "bottom-right") dy = H - padding - dh;
  else dy = (H - dh) / 2;
  return { dx, dy, dw, dh };
}

export function drawLogos(
  ctx: DrawCtx,
  logos: LogoPlacement[],
  dims: Dims,
  images: Record<string, ImageLike>,
  padding: number,
): void {
  for (const p of logos) {
    const img = images[p.logoRef];
    if (!img) continue;
    ctx.globalAlpha = p.opacity ?? 1;
    if (p.free) {
      const dw = dims.width * p.size;
      const dh = dw * (img.height / img.width);
      ctx.drawImage(img, p.free.x * dims.width - dw / 2, p.free.y * dims.height - dh / 2, dw, dh);
    } else {
      for (const a of p.anchors) {
        const { dx, dy, dw, dh } = computeLogoRect(dims.width, dims.height, img.width, img.height, a, p.size, padding);
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    }
    ctx.globalAlpha = 1;
  }
}
```

(d) Ajouter le dessin des logos à la fin de `drawSlide` (par-dessus le texte) et étendre ses opts. Trouver la signature :
```ts
  opts: { dims: Dims; background: Background; contentMargin: ContentMargin; blockPosition: BlockPosition; image?: ImageLike | null },
): void {
```
et remplacer par :
```ts
  opts: { dims: Dims; background: Background; contentMargin: ContentMargin; blockPosition: BlockPosition; image?: ImageLike | null; logos?: LogoPlacement[]; logoImages?: Record<string, ImageLike> },
): void {
```
Puis, tout à la FIN du corps de `drawSlide` (après la boucle de dessin du texte, juste avant l'accolade fermante de la fonction), ajouter :
```ts
  if (opts.logos && opts.logos.length) {
    drawLogos(ctx, opts.logos, opts.dims, opts.logoImages ?? {}, opts.dims.margin);
  }
```

- [ ] **Step 4 : Lancer les tests (succès attendu)**

Run: `npx vitest run app/src/lib/renderer/draw.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add app/src/lib/renderer/draw.ts app/src/lib/renderer/draw.test.ts
git commit -m "feat(renderer): dessin des logos (ancrages/libre/taille/opacité)"
```

---

## Task 4 : Client API — banque de logos + StoryDoc.logos

**Files:**
- Modify: `app/src/lib/api.ts`

- [ ] **Step 1 : Étendre l'import de types du modèle.** Ajouter `LogoPlacement` à l'import `import type { ... } from "./model";`.

- [ ] **Step 2 : Ajouter `logos?: LogoPlacement[];` à l'interface `StoryDoc`** (à côté de `background?`).

- [ ] **Step 3 : Faire suivre `logos` dans `duplicateDoc`.** Dans l'objet `payload`, ajouter `logos: src.logos ?? [],`.

- [ ] **Step 4 : Ajouter les fonctions de banque de logos à la fin de `app/src/lib/api.ts`** (elles réutilisent le type `ImageAsset` déjà exporté) :
```ts
export async function listLogos(): Promise<ImageAsset[]> {
  const res = await fetch("/api/assets/logos");
  if (!res.ok) throw new Error("Chargement des logos impossible");
  return res.json();
}

export async function uploadLogo(file: File): Promise<ImageAsset> {
  const dataUrl = await fileToDataUrl(file);
  const res = await fetch("/api/assets/logos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) throw new Error("Upload du logo impossible");
  return res.json();
}

export async function deleteLogo(ref: string): Promise<void> {
  const res = await fetch(`/api/assets/logos/${ref}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Suppression du logo impossible");
}
```

> `fileToDataUrl` est déjà défini dans ce fichier (Phase 4B-2a).

- [ ] **Step 5 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add app/src/lib/api.ts
git commit -m "feat(api): banque de logos (listLogos/uploadLogo/deleteLogo) + StoryDoc.logos"
```

---

## Task 5 : Aperçu — chargement des images de logo

**Files:**
- Modify: `app/src/components/CanvasPreview.tsx` (remplacement complet)

- [ ] **Step 1 : Remplacer entièrement `app/src/components/CanvasPreview.tsx`** par :

```tsx
import { useEffect, useRef, useState } from "react";
import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background, LogoPlacement } from "@/lib/model";
import { DEFAULT_STYLES, defaultContentMargin, defaultBackground } from "@/lib/model";
import { drawSlide, dimsFor } from "@/lib/renderer/draw";

export function CanvasPreview({
  slide, format, styles, contentMargin, blockPosition, background, logos,
}: {
  slide: Slide | null;
  format: string;
  styles?: Record<LineStyleKey, StyleDef>;
  contentMargin?: ContentMargin;
  blockPosition?: BlockPosition;
  background?: Background;
  logos?: LogoPlacement[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dims = dimsFor(format);
  const st = styles ?? DEFAULT_STYLES;
  const cm = contentMargin ?? defaultContentMargin();
  const bp = blockPosition ?? "center";
  const bg = background ?? defaultBackground();
  const logoList = logos ?? [];

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const wantImage = bg.kind === "image" && !!bg.imageRef;

  const [logoImgs, setLogoImgs] = useState<Record<string, HTMLImageElement>>({});
  const logoRefsKey = logoList.map((l) => l.logoRef).join(",");

  useEffect(() => {
    if (!wantImage) { setImg(null); return; }
    const image = new Image();
    let cancelled = false;
    image.onload = () => { if (!cancelled) setImg(image); };
    image.onerror = () => { if (!cancelled) setImg(null); };
    image.src = `/images/${bg.imageRef}`;
    return () => { cancelled = true; };
  }, [wantImage, bg.imageRef]);

  // Charge les images de logo manquantes.
  useEffect(() => {
    const refs = [...new Set(logoList.map((l) => l.logoRef))];
    let cancelled = false;
    for (const r of refs) {
      if (logoImgs[r]) continue;
      const image = new Image();
      image.onload = () => { if (!cancelled) setLogoImgs((m) => ({ ...m, [r]: image })); };
      image.src = `/logos/${r}`;
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoRefsKey]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      if (slide) {
        drawSlide(ctx, slide, st, { dims, background: bg, contentMargin: cm, blockPosition: bp, image: img, logos: logoList, logoImages: logoImgs });
      } else {
        ctx.clearRect(0, 0, dims.width, dims.height);
      }
    });
    return () => { cancelled = true; };
  }, [slide, st, cm, bp, bg, img, logoList, logoImgs, dims.width, dims.height, dims.margin]);

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
git commit -m "feat(preview): chargement asynchrone des images de logo"
```

---

## Task 6 : Inspecteur « Logo »

**Files:**
- Create: `app/src/components/LogoInspector.tsx`

- [ ] **Step 1 : Implémenter `app/src/components/LogoInspector.tsx`**

```tsx
import { useRef } from "react";
import type { LogoPlacement, Anchor } from "@/lib/model";
import { ANCHORS, newLogoPlacement } from "@/lib/model";
import type { ImageAsset } from "@/lib/api";

const label: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800, margin: "12px 0 4px" };
const seg = (active: boolean): React.CSSProperties => ({ flex: 1, padding: "6px 0", fontSize: 12, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", border: active ? "1.5px solid var(--sage)" : "1px solid var(--line)", background: active ? "#e3efe7" : "#fff", color: "var(--ink)" });

export function LogoInspector({
  logos, onChange, logoAssets, onUpload, onDeleteAsset, scope, onScopeChange, isSlideOverride, onClearSlide,
}: {
  logos: LogoPlacement[];
  onChange: (logos: LogoPlacement[]) => void;
  logoAssets: ImageAsset[];
  onUpload: (file: File) => void;
  onDeleteAsset: (ref: string) => void;
  scope: "story" | "slide";
  onScopeChange: (s: "story" | "slide") => void;
  isSlideOverride: boolean;
  onClearSlide: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const logo = logos[0] ?? null; // 4C : un placement de logo à la fois
  const setLogo = (next: LogoPlacement | null) => onChange(next ? [next] : []);
  const patch = (p: Partial<LogoPlacement>) => { if (logo) setLogo({ ...logo, ...p }); };
  const useAsset = (ref: string) => setLogo(logo ? { ...logo, logoRef: ref } : newLogoPlacement(ref));
  const toggleAnchor = (a: Anchor) => {
    if (!logo) return;
    const on = logo.anchors.includes(a);
    setLogo({ ...logo, free: null, anchors: on ? logo.anchors.filter((x) => x !== a) : [...logo.anchors, a] });
  };

  return (
    <div style={{ width: 260, borderLeft: "1px solid var(--line)", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto", padding: 12 }}>
      <div style={{ fontWeight: 800, color: "var(--sage-deep)", fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Logo</div>

      <div style={label}>Appliquer à</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" style={seg(scope === "story")} onClick={() => onScopeChange("story")}>Toute la story</button>
        <button type="button" style={seg(scope === "slide")} onClick={() => onScopeChange("slide")}>Ce slide</button>
      </div>
      {scope === "slide" && isSlideOverride && (
        <button type="button" className="btn ghost" style={{ fontSize: 12, marginTop: 6 }} onClick={onClearSlide}>↺ Revenir aux logos de la story</button>
      )}

      <div style={label}>Logo</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {logoAssets.map((a) => (
          <div key={a.ref} style={{ position: "relative" }}>
            <button type="button" onClick={() => useAsset(a.ref)} title="Utiliser ce logo"
              style={{ width: "100%", aspectRatio: "1", borderRadius: 8, backgroundImage: `url(${a.url})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundColor: "#eef4f1", cursor: "pointer", border: logo?.logoRef === a.ref ? "2px solid var(--sage)" : "1px solid var(--line)" }} />
            <button type="button" title="Supprimer" onClick={() => onDeleteAsset(a.ref)}
              style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: 5, border: "none", background: "rgba(0,0,0,.5)", color: "#fff", fontSize: 10, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
        ))}
        <button type="button" onClick={() => fileRef.current?.click()} title="Ajouter un logo"
          style={{ aspectRatio: "1", borderRadius: 8, border: "1.5px dashed var(--sage-light)", background: "#f4faf8", color: "var(--sage-deep)", cursor: "pointer", fontSize: 20 }}>＋</button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />

      {logo && (
        <>
          {logo && logos.length > 0 && (
            <button type="button" className="btn ghost" style={{ fontSize: 12, marginTop: 6 }} onClick={() => setLogo(null)}>Retirer le logo</button>
          )}

          <div style={label}>Emplacements (un ou plusieurs)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 30px)", gap: 4 }}>
            {ANCHORS.map((a) => {
              const on = !logo.free && logo.anchors.includes(a);
              return (
                <button key={a} type="button" title={a} onClick={() => toggleAnchor(a)}
                  style={{ width: 30, height: 30, borderRadius: 6, cursor: "pointer", border: on ? "1.5px solid var(--sage)" : "1px solid var(--line)", background: on ? "#e3efe7" : "#fff", color: "var(--sage-deep)", fontSize: 12 }}>●</button>
              );
            })}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, color: "var(--ink)", cursor: "pointer" }}>
            <input type="checkbox" checked={!!logo.free} onChange={(e) => patch(e.target.checked ? { free: { x: 0.8, y: 0.9 } } : { free: null })} />
            Position libre
          </label>
          {logo.free && (
            <div style={{ marginTop: 4 }}>
              <div style={label}>Horizontal — {Math.round(logo.free.x * 100)} %</div>
              <input type="range" min={0} max={1} step={0.01} value={logo.free.x} onChange={(e) => patch({ free: { x: Number(e.target.value), y: logo.free!.y } })} style={{ width: "100%", accentColor: "var(--sage)" }} />
              <div style={label}>Vertical — {Math.round(logo.free.y * 100)} %</div>
              <input type="range" min={0} max={1} step={0.01} value={logo.free.y} onChange={(e) => patch({ free: { x: logo.free!.x, y: Number(e.target.value) } })} style={{ width: "100%", accentColor: "var(--sage)" }} />
            </div>
          )}

          <div style={label}>Taille — {Math.round(logo.size * 100)} % de la largeur</div>
          <input type="range" min={0.04} max={0.4} step={0.01} value={logo.size} onChange={(e) => patch({ size: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--sage)" }} />

          <div style={label}>Opacité — {Math.round(logo.opacity * 100)} %</div>
          <input type="range" min={0.1} max={1} step={0.05} value={logo.opacity} onChange={(e) => patch({ opacity: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--sage)" }} />
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
git add app/src/components/LogoInspector.tsx
git commit -m "feat(editor): inspecteur Logo (banque + ancrages + libre + taille + opacité)"
```

---

## Task 7 : Éditeur — onglet Logo

**Files:**
- Modify: `app/src/pages/Editor.tsx`

- [ ] **Step 1 : Modifier `app/src/pages/Editor.tsx`.**

(a) Étendre l'import de l'API. Trouver :
```ts
import { getDoc, updateDoc, listImages, uploadImage, deleteImage, type ImageAsset } from "@/lib/api";
```
et remplacer par :
```ts
import { getDoc, updateDoc, listImages, uploadImage, deleteImage, listLogos, uploadLogo, deleteLogo, type ImageAsset } from "@/lib/api";
```

(b) Étendre l'import du modèle pour ajouter `effectiveLogos` et le type `LogoPlacement`. Trouver `effectiveBackground, defaultBackground,` dans l'import `@/lib/model` et ajouter `effectiveLogos,` à la liste des valeurs, et `type LogoPlacement,` à la liste des types.

(c) Ajouter l'import du composant :
```ts
import { LogoInspector } from "@/components/LogoInspector";
```

(d) Étendre le type des onglets. Trouver :
```ts
type Tab = "contenu" | "texte" | "fond" | "format";
```
et remplacer par :
```ts
type Tab = "contenu" | "texte" | "fond" | "logo" | "format";
```

(e) Ajouter l'état de la banque de logos et de la portée, juste après le bloc `const [images, setImages] = ...; const refreshImages = ...; useEffect(...)` :
```ts
  const [logoAssets, setLogoAssets] = useState<ImageAsset[]>([]);
  const refreshLogos = () => listLogos().then(setLogoAssets).catch(() => {});
  useEffect(() => { refreshLogos(); }, []);
  const [logoScope, setLogoScope] = useState<"story" | "slide">("story");
```

(f) Ajouter le bouton d'onglet « Logo » entre « Fond » et « Format ». Trouver :
```tsx
              {tabBtn("fond", "Fond")}
              {tabBtn("format", "Format")}
```
et remplacer par :
```tsx
              {tabBtn("fond", "Fond")}
              {tabBtn("logo", "Logo")}
              {tabBtn("format", "Format")}
```

(g) Passer les logos effectifs à l'aperçu. Trouver l'appel `<CanvasPreview ... background={effectiveBackground(doc, slide)} />` et ajouter la prop `logos` :
```tsx
            <CanvasPreview slide={slide} format={doc.format} styles={doc.styles} contentMargin={doc.contentMargin} blockPosition={doc.blockPosition} background={effectiveBackground(doc, slide)} logos={effectiveLogos(doc, slide)} />
```

(h) Ajouter le panneau « Logo » dans l'inspecteur, JUSTE AVANT le bloc `{tab === "format" && (` :
```tsx
              {tab === "logo" && (
                <LogoInspector
                  scope={logoScope}
                  onScopeChange={setLogoScope}
                  logos={logoScope === "slide" ? (slide?.logos ?? doc.logos) : doc.logos}
                  isSlideOverride={!!(slide && slide.logos)}
                  onClearSlide={() => updateSlide(idx, (s) => ({ ...s, logos: null }))}
                  logoAssets={logoAssets}
                  onUpload={(file) => uploadLogo(file).then(refreshLogos).catch((e) => setError((e as Error).message))}
                  onDeleteAsset={(ref) => deleteLogo(ref).then(refreshLogos).catch(() => {})}
                  onChange={(next: LogoPlacement[]) => {
                    if (logoScope === "slide") updateSlide(idx, (s) => ({ ...s, logos: next }));
                    else setDoc({ ...doc, logos: next });
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
git commit -m "feat(editor): onglet Logo (banque + placement, portée story/slide)"
```

---

## Task 8 : Vérification end-to-end

- [ ] **Step 1 : Suite de tests**

Run: `npm test`
Expected: tous PASS (0 échec). Le décompte augmente (assets logos + model + renderer logos).

- [ ] **Step 2 : Vérification serveur (upload logo réel)**

```bash
npm run build
NODE_ENV=production PORT=4321 node server/index.js &
SERVER_PID=$!
sleep 1
node -e "const d='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='; fetch('http://localhost:4321/api/assets/logos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataUrl:d})}).then(r=>r.json()).then(a=>{console.log('logo:',JSON.stringify(a)); return fetch('http://localhost:4321'+a.url).then(r=>console.log('GET',a.url,'->',r.status));})"
ls logos/
```
Expected : `logo: {ref, url:/logos/...}`, `GET /logos/<ref> -> 200`, un fichier dans `logos/`.

- [ ] **Step 3 : Vérification navigateur (parcours réel)**

Sur `http://localhost:4321` : créer une Story → onglet **Logo** → **＋** (uploader un logo) → cliquer la vignette → cocher plusieurs **emplacements** (ex. haut-gauche + bas-droite) → le logo apparaît aux deux coins de l'aperçu → régler **taille** et **opacité** → tester **Position libre** (curseurs x/y). Basculer la portée sur **Ce slide**. Revenir puis rouvrir → les logos sont **conservés** (persistance : vérifier `doc.logos`).

```bash
kill $SERVER_PID
```

- [ ] **Step 4 : Nettoyage** :
```bash
rm -f logos/* images/* data/stories/*.json 2>/dev/null || true
```

- [ ] **Step 5 : Commit** (uniquement si des correctifs ont été nécessaires).

---

## Definition of Done (Phase 4C)

- **Banque de logos** côté serveur (upload/liste/suppression, service `/logos`), obtenue en généralisant le module `assets` (images + logos). Testée.
- Un **logo** est sélectionnable depuis l'onglet « Logo » (banque avec upload/suppression) et placé à **une ou plusieurs positions** (grille de 9 ancrages) **ou en position libre** (curseurs x/y), avec **taille** et **opacité** réglables ; portée toute-la-story ou ce-slide.
- Le moteur dessine les logos par-dessus le texte (`drawLogos`, testé : ancrages, position libre, image manquante).
- Les logos sont persistés par document/slide ; documents anciens normalisés (`logos: []`).
- `npm test` vert ; `npm run build` vert.
- Base prête pour la **Phase 5 (export)** ou la **4B-2b (ajustements d'image)**.
```
