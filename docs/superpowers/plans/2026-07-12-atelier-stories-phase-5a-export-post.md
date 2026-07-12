# Atelier de Stories — Phase 5a : Export Post (image + carrousel) · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exporter un Post en **image PNG** (un slide) et un post multi-slides en **carrousel .zip** (une image par slide), téléchargés depuis l'éditeur, avec le rendu exact de l'aperçu (fond, texte, voile, logo).

**Architecture:** Un module d'export client (`lib/export.ts`) charge les ressources (images de fond + logos), rend chaque slide sur un canvas hors-écran via le moteur `drawSlide` existant, produit un `Blob` PNG (ou un .zip via JSZip pour le carrousel), et déclenche un téléchargement navigateur. L'éditeur ajoute des boutons d'export contextuels (Post uniquement ; la vidéo Story arrive en 5b).

**Tech Stack:** React 18, TypeScript, Vite, Canvas 2D, JSZip, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-07-12-atelier-stories-altitude-design.md` (§11 Export).

**Décomposition de la Phase 5 :** 5a (ce plan) = export Post (image + carrousel). 5b = export Story MP4 (animation + MediaRecorder).

**Portée EXCLUE de la 5a :** vidéo Story / MediaRecorder / animation / durée-transition (→ 5b) · archivage serveur dans `exports/` (l'export 5a télécharge dans le dossier Téléchargements du navigateur) · export JPG (PNG uniquement pour l'instant).

**Note de test :** l'essentiel de l'export est du code navigateur (canvas, `toBlob`, téléchargement) non unitaire ; on teste la partie pure (`slug`) et on vérifie le reste en navigateur (rendu → image non vide).

---

## Structure de fichiers de cette phase

```
package.json                ← (MODIFIÉ) dépendance jszip
app/src/
├─ lib/
│  └─ export.ts             ← (NOUVEAU) chargement ressources + rendu slide→canvas + export image/carrousel + slug
└─ pages/Editor.tsx         ← (MODIFIÉ) boutons d'export (Post) + statut
```

---

## Task 1 : Dépendance JSZip

**Files:**
- Modify: `package.json`

- [ ] **Step 1 : Installer JSZip**

Run: `npm install jszip@^3.10.1`
Expected: `jszip` ajouté aux `dependencies`, `node_modules/jszip` présent.

- [ ] **Step 2 : Vérifier que le projet compile et teste toujours**

Run: `npm test`
Expected: tous les tests PASS (aucune régression).

- [ ] **Step 3 : Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: dépendance jszip (export carrousel)"
```

---

## Task 2 : Module d'export

**Files:**
- Create: `app/src/lib/export.ts`
- Test: `app/src/lib/export.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue** `app/src/lib/export.test.ts` (on teste la partie pure `slug`) :

```ts
import { describe, it, expect } from "vitest";
import { slug } from "./export";

describe("slug", () => {
  it("normalise un titre en nom de fichier", () => {
    expect(slug("Dispos juillet")).toBe("dispos-juillet");
    expect(slug("Été 2026 !")).toBe("ete-2026");
    expect(slug("  ")).toBe("export");
    expect(slug("")).toBe("export");
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run app/src/lib/export.test.ts`
Expected: FAIL — `Cannot find module './export'`.

- [ ] **Step 3 : Implémenter `app/src/lib/export.ts`**

```ts
import JSZip from "jszip";
import type { ResolvedDoc, Slide } from "./model";
import { effectiveBackground, effectiveLogos } from "./model";
import { drawSlide, dimsFor } from "./renderer/draw";

export function slug(title: string): string {
  const s = (title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "export";
}

export interface Resources {
  bgImages: Record<string, HTMLImageElement>;
  logoImages: Record<string, HTMLImageElement>;
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image introuvable : ${url}`));
    img.src = url;
  });
}

/** Charge toutes les images de fond et de logo référencées par le document. */
export async function loadResources(doc: ResolvedDoc): Promise<Resources> {
  const bgRefs = new Set<string>();
  const logoRefs = new Set<string>();
  const collect = (slide: Slide | null) => {
    const bg = effectiveBackground(doc, slide);
    if (bg.kind === "image" && bg.imageRef) bgRefs.add(bg.imageRef);
    for (const l of effectiveLogos(doc, slide)) logoRefs.add(l.logoRef);
  };
  collect(null);
  for (const s of doc.slides) collect(s);

  const bgImages: Record<string, HTMLImageElement> = {};
  const logoImages: Record<string, HTMLImageElement> = {};
  await Promise.all([...bgRefs].map(async (r) => { try { bgImages[r] = await loadImg(`/images/${r}`); } catch { /* fond manquant : repli couleur */ } }));
  await Promise.all([...logoRefs].map(async (r) => { try { logoImages[r] = await loadImg(`/logos/${r}`); } catch { /* logo manquant : ignoré */ } }));
  return { bgImages, logoImages };
}

/** Rend un slide sur un canvas hors-écran, aux dimensions du format. */
export function renderSlideToCanvas(doc: ResolvedDoc, slide: Slide, res: Resources): HTMLCanvasElement {
  const dims = dimsFor(doc.format);
  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  const bg = effectiveBackground(doc, slide);
  const image = bg.kind === "image" && bg.imageRef ? (res.bgImages[bg.imageRef] ?? null) : null;
  drawSlide(ctx, slide, doc.styles, {
    dims,
    background: bg,
    contentMargin: doc.contentMargin,
    blockPosition: doc.blockPosition,
    image,
    logos: effectiveLogos(doc, slide),
    logoImages: res.logoImages,
  });
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export image impossible"))), type);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Produit le Blob PNG du 1er slide (sans télécharger) — utile pour la vérification. */
export async function renderPostBlob(doc: ResolvedDoc): Promise<Blob> {
  const res = await loadResources(doc);
  await document.fonts.ready;
  return canvasToBlob(renderSlideToCanvas(doc, doc.slides[0], res), "image/png");
}

export async function exportPostImage(doc: ResolvedDoc): Promise<void> {
  const blob = await renderPostBlob(doc);
  downloadBlob(blob, `${slug(doc.title)}.png`);
}

export async function exportCarousel(doc: ResolvedDoc): Promise<void> {
  const res = await loadResources(doc);
  await document.fonts.ready;
  const zip = new JSZip();
  for (let i = 0; i < doc.slides.length; i++) {
    const blob = await canvasToBlob(renderSlideToCanvas(doc, doc.slides[i], res), "image/png");
    zip.file(`${String(i + 1).padStart(2, "0")}.png`, blob);
  }
  const out = await zip.generateAsync({ type: "blob" });
  downloadBlob(out, `${slug(doc.title)}-carrousel.zip`);
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `npx vitest run app/src/lib/export.test.ts`
Expected: PASS.

- [ ] **Step 5 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add app/src/lib/export.ts app/src/lib/export.test.ts
git commit -m "feat(export): rendu slide→PNG + carrousel zip + téléchargement"
```

---

## Task 3 : Éditeur — boutons d'export (Post)

**Files:**
- Modify: `app/src/pages/Editor.tsx`

- [ ] **Step 1 : Modifier `app/src/pages/Editor.tsx`.**

(a) Ajouter l'import du module d'export (près des autres imports) :
```ts
import { exportPostImage, exportCarousel } from "@/lib/export";
```

(b) Ajouter un état d'export, juste après `const [saved, setSaved] = useState(false);` :
```ts
  const [exporting, setExporting] = useState(false);
```

(c) Ajouter la fonction d'export, juste après la fonction `handleBack` (au niveau du composant, avant le premier `return`) :
```ts
  const runExport = async (kind: "image" | "carrousel") => {
    if (!doc) return;
    setExporting(true);
    try {
      if (kind === "carrousel") await exportCarousel(doc);
      else await exportPostImage(doc);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };
```

(d) Ajouter les boutons d'export dans la barre du haut. Trouver le bloc `top-actions` de l'en-tête :
```tsx
          <div className="top-actions">
            <span style={{ color: "var(--sage-deep)", fontSize: 13, fontWeight: 700, opacity: saved ? 1 : 0, transition: "opacity .3s" }}>✓ Enregistré</span>
          </div>
```
et remplacer par :
```tsx
          <div className="top-actions">
            <span style={{ color: "var(--sage-deep)", fontSize: 13, fontWeight: 700, opacity: saved ? 1 : 0, transition: "opacity .3s" }}>✓ Enregistré</span>
            {doc.type === "post" ? (
              <>
                <button type="button" className="btn" disabled={exporting} onClick={() => runExport("image")}>⤓ Image</button>
                {doc.slides.length > 1 && (
                  <button type="button" className="btn ghost" disabled={exporting} onClick={() => runExport("carrousel")}>⤓ Carrousel</button>
                )}
              </>
            ) : (
              <button type="button" className="btn ghost" disabled title="L'export vidéo arrive en Phase 5b">🎬 Vidéo (bientôt)</button>
            )}
          </div>
```

- [ ] **Step 2 : Build complet (tsc + vite)**

Run: `npm run build`
Expected: succès, aucune erreur TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add app/src/pages/Editor.tsx
git commit -m "feat(editor): boutons d'export Post (image / carrousel)"
```

---

## Task 4 : Vérification end-to-end

- [ ] **Step 1 : Suite de tests**

Run: `npm test`
Expected: tous PASS (0 échec).

- [ ] **Step 2 : Vérification navigateur (rendu → image)**

```bash
npm run build
NODE_ENV=production PORT=4321 node server/index.js &
SERVER_PID=$!
sleep 1
```

Sur `http://localhost:4321` (navigateur ou Puppeteer) :
1. Créer un **Post carré** (« + Nouveau » → 🖼️ Post carré). Éditer un peu de texte, régler un fond couleur.
2. Vérifier que la barre du haut affiche **⤓ Image** (et **⤓ Carrousel** si plusieurs slides).
3. **Vérification du rendu par script** (Puppeteer `evaluate`) — confirmer qu'un slide se rend en PNG non vide, sans dépendre du téléchargement du navigateur :
```js
// dans la page, l'éditeur d'un post étant ouvert :
(async () => {
  const mod = await import('/src/lib/export.ts').catch(() => null); // en dev ; en prod le module est bundlé
  return 'ok';
})();
```
   > En pratique (build de prod, module bundlé et non importable par URL), vérifier plutôt en cliquant **⤓ Image** : un téléchargement `<titre>.png` démarre. Alternative fiable sans dépendre du téléchargement : rendre un slide via un canvas ad hoc et lire `toDataURL` :
```js
(() => {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#4e7a63'; ctx.fillRect(0,0,1080,1080);
  const url = c.toDataURL('image/png');
  return { isPng: url.startsWith('data:image/png'), len: url.length };
})();
```
   Expected : `{ isPng: true, len: > 1000 }` — confirme que la chaîne canvas→PNG fonctionne dans l'environnement.
4. Cliquer **⤓ Image** → un fichier `<titre>.png` est téléchargé (vérifier dans le dossier Téléchargements). Pour un post multi-slides, **⤓ Carrousel** télécharge un `.zip` contenant une image par slide.

```bash
kill $SERVER_PID
```

- [ ] **Step 3 : Commit** (uniquement si des correctifs ont été nécessaires).

---

## Definition of Done (Phase 5a)

- Un **Post** s'exporte en **image PNG** (bouton ⤓ Image) et, s'il a plusieurs slides, en **carrousel .zip** (bouton ⤓ Carrousel), téléchargés depuis l'éditeur.
- L'export rend **exactement l'aperçu** : fond (couleur/image + voile + ajustements), texte stylé, logos — via le moteur `drawSlide` sur un canvas hors-écran aux dimensions du format.
- Les ressources (images de fond, logos) sont chargées avant le rendu ; un asset manquant ne fait pas échouer l'export (repli).
- Le bouton vidéo (Story) est présent mais désactivé (« bientôt » — arrive en 5b).
- `npm test` vert ; `npm run build` vert.
- Base (chargement ressources, rendu slide→canvas) prête pour la **Phase 5b (export vidéo MP4)**.
```
