# Atelier de Stories — Phase 5b : Export Story MP4 (animation + MediaRecorder) · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exporter une **Story** en **vidéo** (MP4 H.264, repli WebM) 1080×1920, en enchaînant les slides par fondus enchaînés (`in → hold → (cross → hold)×N`) **sans fondu sortant** — la vidéo se termine sur la **dernière image figée** (le texte ne disparaît pas). Réglages **durée** et **transition** dans l'onglet Format ; téléchargement depuis l'éditeur.

**Architecture:** La logique d'animation est **pure et testable** (`lib/anim.ts` : `buildStoryPhases`, `phasesTotalDuration`, `frameAt`). Le module d'export vidéo (`lib/video.ts`, code navigateur) pré-rend chaque slide sur un canvas hors-écran (via `renderSlideToCanvas` de la Phase 5a), pilote une boucle `requestAnimationFrame` qui compose les slides voisins par `globalAlpha` selon la phase courante, enregistre le flux `canvas.captureStream(30)` via **MediaRecorder**, maintient la dernière image figée un court instant, puis produit un `Blob` téléchargé. Le modèle gagne un champ `timing`, l'onglet Format des curseurs, et le bouton « 🎬 Vidéo » est activé pour les stories.

**Tech Stack:** React 18, TypeScript, Vite, Canvas 2D, MediaRecorder / `captureStream`, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-07-12-atelier-stories-altitude-design.md` (§10 Rendu & animation — dernière image figée ; §11 Export — Story → MP4).

**Décomposition de la Phase 5 :** 5a (livrée) = export Post (image + carrousel). 5b (ce plan) = export Story vidéo (animation + MediaRecorder).

**Portée EXCLUE de la 5b :** archivage serveur dans `exports/` + `exports/Archives/` (l'export télécharge dans le dossier Téléchargements du navigateur, comme la 5a) · overlay « zones de sécurité » Instagram (Phase 6) · alerte de débordement (Phase 6) · bande sonore · réglage du FPS / du bitrate depuis l'UI (constantes internes).

**Notes de conception (verrouillées) :**
- **Pas de fondu sortant.** La séquence est exactement `in, hold, (cross, hold)×(N−1)` : elle se **termine sur un `hold`** de la dernière image → dernière image figée. La « respiration » finale (maintien de l'image figée après la fin de l'animation, avant l'arrêt de l'enregistrement) est gérée dans le module vidéo (constante `FINAL_FREEZE_S`), **pas** dans les phases (qui restent pures).
- **`in`** = fondu d'apparition du slide 0 depuis le noir. **`hold`** = slide affiché fixe. **`cross`** = fondu enchaîné du slide `from` vers le slide `to` (les deux slides — fond + texte + logo — sont pré-rendus, on compose par `globalAlpha`).
- **Défauts timing** : `duration = 4.5` s (maintien par slide), `transition = 0.7` s (fondus). `transition` peut valoir 0 (coupe franche).
- **Codec** : on tente `video/mp4;codecs=avc1…` puis `video/mp4`, repli `video/webm…`. L'extension du fichier suit le type réellement retenu.

**Note de test :** la logique d'animation (`anim.ts`) et le champ `timing` du modèle sont **purs → testés en Vitest (TDD)**. Le module vidéo (`video.ts`, `MediaRecorder`/`captureStream`/`requestAnimationFrame`) et l'UI se **vérifient en navigateur** (Puppeteer) : un clic « 🎬 Vidéo » produit un fichier non vide.

---

## Structure de fichiers de cette phase

```
app/src/
├─ lib/
│  ├─ model.ts               ← (MODIFIÉ) type Timing + defaultTiming + champ timing (payload/DocLike/ResolvedDoc) + ensureDocDefaults + baseNew
│  ├─ model.test.ts          ← (MODIFIÉ) tests de defaultTiming + timing dans ensureDocDefaults / newStoryPayload
│  ├─ anim.ts                ← (NOUVEAU) moteur d'animation pur : Phase, buildStoryPhases, phasesTotalDuration, frameAt
│  ├─ anim.test.ts           ← (NOUVEAU) tests du moteur d'animation
│  └─ video.ts               ← (NOUVEAU) export vidéo navigateur : pickMime + exportStoryVideo (pré-rendu, rAF, MediaRecorder, download)
└─ components/
│  └─ FormatInspector.tsx    ← (MODIFIÉ) curseurs Durée / Transition (props optionnelles, affichés pour la story)
└─ pages/Editor.tsx          ← (MODIFIÉ) bouton « 🎬 Vidéo » actif + état/progression + passage de timing à FormatInspector
```

---

## Task 1 : Modèle — champ `timing`

**Files:**
- Modify: `app/src/lib/model.ts`
- Test: `app/src/lib/model.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent.** Ajouter ce bloc à la fin de `app/src/lib/model.test.ts` (adapter les imports existants — voir Step 2 pour les symboles à importer) :

```ts
import { defaultTiming } from "./model";

describe("timing", () => {
  it("defaultTiming renvoie 4.5 s de maintien et 0.7 s de transition", () => {
    expect(defaultTiming()).toEqual({ duration: 4.5, transition: 0.7 });
  });

  it("ensureDocDefaults ajoute timing quand il est absent", () => {
    const doc = ensureDocDefaults({
      id: "x", type: "story", format: "9:16", title: "t",
      status: "draft", createdAt: "2026-07-12", updatedAt: "2026-07-12", slides: [],
    });
    expect(doc.timing).toEqual({ duration: 4.5, transition: 0.7 });
  });

  it("ensureDocDefaults préserve un timing fourni", () => {
    const doc = ensureDocDefaults({
      id: "x", type: "story", format: "9:16", title: "t",
      status: "draft", createdAt: "2026-07-12", updatedAt: "2026-07-12", slides: [],
      timing: { duration: 3, transition: 0.4 },
    });
    expect(doc.timing).toEqual({ duration: 3, transition: 0.4 });
  });

  it("newStoryPayload a un timing par défaut", () => {
    expect(newStoryPayload().timing).toEqual({ duration: 4.5, transition: 0.7 });
  });
});
```

> Si `ensureDocDefaults` et `newStoryPayload` sont déjà importés en haut du fichier de test, ne pas les réimporter — n'ajouter que `defaultTiming` à l'import existant `from "./model"`.

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: FAIL — `defaultTiming is not a function` / `timing` absent.

- [ ] **Step 3 : Implémenter dans `app/src/lib/model.ts`.**

(a) Ajouter le type `Timing` juste après l'interface `Filters` (après la ligne `}` qui ferme `export interface Filters { … }`) :
```ts
export interface Timing {
  duration: number;   // maintien par slide, en secondes
  transition: number; // durée du fondu enchaîné, en secondes
}
```

(b) Ajouter la fabrique par défaut juste après la fonction `defaultFilters()` :
```ts
export function defaultTiming(): Timing {
  return { duration: 4.5, transition: 0.7 };
}
```

(c) Dans `export interface StoryPayload`, ajouter le champ (après `logos: LogoPlacement[];`) :
```ts
  timing?: Timing;
```

(d) Dans `export interface DocLike`, ajouter le champ (après `logos?: LogoPlacement[];`) :
```ts
  timing?: Timing;
```

(e) Dans `export interface ResolvedDoc extends DocLike`, ajouter le champ requis (après `logos: LogoPlacement[];`) :
```ts
  timing: Timing;
```

(f) Dans `ensureDocDefaults`, ajouter la ligne dans l'objet retourné (après `logos: doc.logos ?? [],`) :
```ts
    timing: doc.timing ?? defaultTiming(),
```

(g) Dans `baseNew`, ajouter la ligne dans l'objet retourné (après `logos: [],`) :
```ts
    timing: defaultTiming(),
```

- [ ] **Step 4 : Lancer les tests (succès attendu)**

Run: `npx vitest run app/src/lib/model.test.ts`
Expected: PASS.

- [ ] **Step 5 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add app/src/lib/model.ts app/src/lib/model.test.ts
git commit -m "feat(model): champ timing (durée/transition) + defaultTiming"
```

---

## Task 2 : Moteur d'animation (pur)

**Files:**
- Create: `app/src/lib/anim.ts`
- Test: `app/src/lib/anim.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue** dans `app/src/lib/anim.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { buildStoryPhases, phasesTotalDuration, frameAt } from "./anim";

const T = { duration: 4.5, transition: 0.7 };

describe("buildStoryPhases", () => {
  it("renvoie une liste vide pour 0 slide", () => {
    expect(buildStoryPhases(0, T)).toEqual([]);
  });

  it("un seul slide : in puis hold (pas de fondu sortant)", () => {
    expect(buildStoryPhases(1, T)).toEqual([
      { kind: "in", from: 0, to: 0, duration: 0.7 },
      { kind: "hold", from: 0, to: 0, duration: 4.5 },
    ]);
  });

  it("trois slides : in, hold, (cross, hold)×2, se termine sur un hold", () => {
    const p = buildStoryPhases(3, T);
    expect(p.map((x) => x.kind)).toEqual(["in", "hold", "cross", "hold", "cross", "hold"]);
    expect(p[2]).toEqual({ kind: "cross", from: 0, to: 1, duration: 0.7 });
    expect(p[4]).toEqual({ kind: "cross", from: 1, to: 2, duration: 0.7 });
    expect(p[p.length - 1]).toEqual({ kind: "hold", from: 2, to: 2, duration: 4.5 });
  });
});

describe("phasesTotalDuration", () => {
  it("somme les durées des phases", () => {
    // 2 slides : 0.7 + 4.5 + 0.7 + 4.5 = 10.4
    expect(phasesTotalDuration(buildStoryPhases(2, T))).toBeCloseTo(10.4, 5);
  });
});

describe("frameAt", () => {
  const phases = buildStoryPhases(2, T); // in .7 | hold 4.5 | cross .7 | hold 4.5

  it("t=0 → apparition du slide 0, progression 0", () => {
    expect(frameAt(phases, 0)).toEqual({ kind: "in", from: 0, to: 0, t: 0 });
  });

  it("milieu de l'apparition → progression 0.5", () => {
    expect(frameAt(phases, 0.35)).toEqual({ kind: "in", from: 0, to: 0, t: 0.5 });
  });

  it("pendant le maintien → hold slide 0", () => {
    const f = frameAt(phases, 1.0);
    expect(f.kind).toBe("hold");
    expect(f.from).toBe(0);
  });

  it("milieu du fondu enchaîné → cross 0→1 progression 0.5", () => {
    const f = frameAt(phases, 5.2 + 0.35); // 0.7+4.5 = 5.2, +0.35 = milieu du cross
    expect(f.kind).toBe("cross");
    expect(f.from).toBe(0);
    expect(f.to).toBe(1);
    expect(f.t).toBeCloseTo(0.5, 5);
  });

  it("au-delà de la fin → dernière image figée (hold slide final, t=1)", () => {
    expect(frameAt(phases, 999)).toEqual({ kind: "hold", from: 1, to: 1, t: 1 });
  });

  it("liste vide → hold slide 0 figé", () => {
    expect(frameAt([], 0)).toEqual({ kind: "hold", from: 0, to: 0, t: 1 });
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run app/src/lib/anim.test.ts`
Expected: FAIL — `Cannot find module './anim'`.

- [ ] **Step 3 : Implémenter `app/src/lib/anim.ts`**

```ts
import type { Timing } from "./model";

export type PhaseKind = "in" | "hold" | "cross";

export interface Phase {
  kind: PhaseKind;
  from: number;    // index du slide affiché au début de la phase
  to: number;      // index du slide cible (== from sauf pour "cross")
  duration: number; // en secondes
}

export interface FrameState {
  kind: PhaseKind;
  from: number;
  to: number;
  t: number; // progression 0..1 dans la phase
}

/**
 * Séquence d'animation d'une story : `in → hold → (cross → hold)×(count-1)`.
 * PAS de fondu sortant : la liste se termine toujours sur un `hold` du dernier slide
 * (dernière image figée). La « respiration » finale est gérée par le module vidéo.
 */
export function buildStoryPhases(count: number, timing: Timing): Phase[] {
  if (count <= 0) return [];
  const { duration, transition } = timing;
  const phases: Phase[] = [
    { kind: "in", from: 0, to: 0, duration: transition },
    { kind: "hold", from: 0, to: 0, duration },
  ];
  for (let i = 1; i < count; i++) {
    phases.push({ kind: "cross", from: i - 1, to: i, duration: transition });
    phases.push({ kind: "hold", from: i, to: i, duration });
  }
  return phases;
}

export function phasesTotalDuration(phases: Phase[]): number {
  return phases.reduce((sum, p) => sum + p.duration, 0);
}

/**
 * État de rendu à l'instant `time` (secondes). Au-delà de la durée totale,
 * renvoie la dernière phase avec t=1 (image figée). Liste vide → hold slide 0.
 */
export function frameAt(phases: Phase[], time: number): FrameState {
  if (phases.length === 0) return { kind: "hold", from: 0, to: 0, t: 1 };
  let acc = 0;
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const isLast = i === phases.length - 1;
    if (time < acc + p.duration || isLast) {
      const t = p.duration > 0 ? Math.min(1, Math.max(0, (time - acc) / p.duration)) : 1;
      return { kind: p.kind, from: p.from, to: p.to, t };
    }
    acc += p.duration;
  }
  const last = phases[phases.length - 1];
  return { kind: last.kind, from: last.from, to: last.to, t: 1 };
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `npx vitest run app/src/lib/anim.test.ts`
Expected: PASS.

- [ ] **Step 5 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add app/src/lib/anim.ts app/src/lib/anim.test.ts
git commit -m "feat(anim): moteur de phases pur (buildStoryPhases/frameAt) — dernière image figée"
```

---

## Task 3 : Module d'export vidéo (navigateur)

**Files:**
- Create: `app/src/lib/video.ts`

> Ce module est du code navigateur (MediaRecorder, `captureStream`, `requestAnimationFrame`, `performance.now`) — non couvert par Vitest. On vérifie sa compilation ici (`tsc`) et son comportement en navigateur à la Task 6. Il réutilise `loadResources`, `renderSlideToCanvas`, `downloadBlob`, `slug` de la Phase 5a et le moteur pur de la Task 2.

- [ ] **Step 1 : Implémenter `app/src/lib/video.ts`**

```ts
import type { ResolvedDoc } from "./model";
import { loadResources, renderSlideToCanvas, downloadBlob, slug } from "./export";
import { buildStoryPhases, phasesTotalDuration, frameAt } from "./anim";
import { dimsFor } from "./renderer/draw";

const FPS = 30;
const FINAL_FREEZE_S = 0.6;         // maintien de l'image figée avant l'arrêt de l'enregistrement
const VIDEO_BITS_PER_SECOND = 8_000_000;

// Codecs tentés dans l'ordre : MP4 H.264 d'abord, repli WebM.
const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

/** Choisit le premier type MIME supporté ; renvoie l'extension de fichier associée. */
export function pickMime(): { mime: string; ext: string } {
  const ok = (m: string) =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m);
  for (const m of MIME_CANDIDATES) {
    if (ok(m)) return { mime: m, ext: m.startsWith("video/mp4") ? "mp4" : "webm" };
  }
  return { mime: "", ext: "webm" }; // laisser le navigateur décider
}

/**
 * Rend la story en vidéo et déclenche le téléchargement.
 * `onProgress(ratio)` est appelé pendant l'enregistrement (0 → 1).
 */
export async function exportStoryVideo(
  doc: ResolvedDoc,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  const dims = dimsFor(doc.format);
  const res = await loadResources(doc);
  await document.fonts.ready;

  // Pré-rendu de chaque slide (fond + texte + logo) sur un canvas hors-écran.
  const layers = doc.slides.map((s) => renderSlideToCanvas(doc, s, res));
  if (layers.length === 0) throw new Error("La story ne contient aucun slide.");

  const phases = buildStoryPhases(layers.length, doc.timing);
  const total = phasesTotalDuration(phases);

  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");

  const drawFrame = (time: number) => {
    const f = frameAt(phases, time);
    ctx.clearRect(0, 0, dims.width, dims.height);
    if (f.kind === "in") {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, dims.width, dims.height);
      ctx.globalAlpha = f.t;
      ctx.drawImage(layers[f.from], 0, 0);
      ctx.globalAlpha = 1;
    } else if (f.kind === "cross") {
      ctx.drawImage(layers[f.from], 0, 0);
      ctx.globalAlpha = f.t;
      ctx.drawImage(layers[f.to], 0, 0);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(layers[f.from], 0, 0);
    }
  };

  // Dessiner la première image avant de démarrer l'enregistrement.
  drawFrame(0);

  const stream = canvas.captureStream(FPS);
  const { mime, ext } = pickMime();
  const rec = new MediaRecorder(
    stream,
    mime
      ? { mimeType: mime, videoBitsPerSecond: VIDEO_BITS_PER_SECOND }
      : { videoBitsPerSecond: VIDEO_BITS_PER_SECOND },
  );
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  const recorded = new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime || "video/webm" }));
  });

  rec.start();

  // Boucle d'animation pilotée par le temps réel.
  await new Promise<void>((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const time = (performance.now() - t0) / 1000;
      if (time >= total) {
        drawFrame(total);        // dernière image figée
        onProgress?.(1);
        window.setTimeout(resolve, FINAL_FREEZE_S * 1000); // « respiration » finale
        return;
      }
      drawFrame(time);
      onProgress?.(total > 0 ? time / total : 1);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  rec.stop();
  const blob = await recorded;
  downloadBlob(blob, `${slug(doc.title)}.${ext}`);
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur. (Les types `MediaRecorder`, `captureStream`, `requestAnimationFrame`, `performance` proviennent de la lib DOM déjà utilisée par `export.ts`.)

- [ ] **Step 3 : Commit**

```bash
git add app/src/lib/video.ts
git commit -m "feat(video): export Story → MediaRecorder (MP4/WebM), fondus enchaînés, image finale figée"
```

---

## Task 4 : FormatInspector — curseurs Durée / Transition

**Files:**
- Modify: `app/src/components/FormatInspector.tsx`

> Les nouvelles props sont **optionnelles** : l'`Editor` (non encore modifié) continue de compiler entre les tâches. Les curseurs ne s'affichent que si `timing` et `onChangeTiming` sont fournis (donc pour la story, cf. Task 5).

- [ ] **Step 1 : Modifier `app/src/components/FormatInspector.tsx`.**

(a) Remplacer la ligne d'import du modèle :
```ts
import type { ContentMargin, BlockPosition } from "@/lib/model";
```
par :
```ts
import type { ContentMargin, BlockPosition, Timing } from "@/lib/model";
```

(b) Remplacer la signature du composant :
```ts
export function FormatInspector({
  formatLabel, contentMargin, blockPosition, onChangeContentMargin, onChangeBlockPosition,
}: {
  formatLabel: string;
  contentMargin: ContentMargin;
  blockPosition: BlockPosition;
  onChangeContentMargin: (m: ContentMargin) => void;
  onChangeBlockPosition: (p: BlockPosition) => void;
}) {
```
par :
```ts
export function FormatInspector({
  formatLabel, contentMargin, blockPosition, onChangeContentMargin, onChangeBlockPosition,
  timing, onChangeTiming,
}: {
  formatLabel: string;
  contentMargin: ContentMargin;
  blockPosition: BlockPosition;
  onChangeContentMargin: (m: ContentMargin) => void;
  onChangeBlockPosition: (p: BlockPosition) => void;
  timing?: Timing;
  onChangeTiming?: (t: Timing) => void;
}) {
```

(c) Ajouter le bloc des curseurs **juste avant** le `</div>` final qui ferme le conteneur racine (après le bloc « Position du bloc », c.-à-d. après le `</div>` qui ferme `<div style={{ display: "flex", gap: 6 }}>`) :
```tsx
      {timing && onChangeTiming && (
        <>
          <div style={label}>Animation vidéo</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink)" }}>
            <span>Durée par slide</span><span style={{ fontWeight: 700 }}>{timing.duration.toFixed(1)} s</span>
          </div>
          <input type="range" min={1.5} max={8} step={0.5} value={timing.duration}
            onChange={(e) => onChangeTiming({ ...timing, duration: Number(e.target.value) })}
            style={{ width: "100%" }} aria-label="Durée par slide" />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink)", marginTop: 8 }}>
            <span>Transition</span><span style={{ fontWeight: 700 }}>{timing.transition.toFixed(1)} s</span>
          </div>
          <input type="range" min={0} max={2} step={0.1} value={timing.transition}
            onChange={(e) => onChangeTiming({ ...timing, transition: Number(e.target.value) })}
            style={{ width: "100%" }} aria-label="Transition" />
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>La vidéo se termine sur la dernière image figée.</div>
        </>
      )}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur (l'`Editor` ne passe pas encore ces props — elles sont optionnelles).

- [ ] **Step 3 : Commit**

```bash
git add app/src/components/FormatInspector.tsx
git commit -m "feat(format): curseurs durée / transition (story)"
```

---

## Task 5 : Éditeur — bouton « 🎬 Vidéo » actif + branchement timing

**Files:**
- Modify: `app/src/pages/Editor.tsx`

- [ ] **Step 1 : Modifier `app/src/pages/Editor.tsx`.**

(a) Ajouter l'import du module vidéo, juste après l'import de l'export Post :
```ts
import { exportStoryVideo } from "@/lib/video";
```
(la ligne existante est `import { exportPostImage, exportCarousel } from "@/lib/export";`)

(b) Ajouter un état de progression vidéo, juste après `const [exporting, setExporting] = useState(false);` :
```ts
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
```

(c) Ajouter la fonction d'export vidéo, juste après la fonction `runExport` (avant le premier `return` du composant) :
```ts
  const runVideo = async () => {
    if (!doc) return;
    setExporting(true);
    setVideoProgress(0);
    try {
      await exportStoryVideo(doc, (r) => setVideoProgress(r));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
      setVideoProgress(null);
    }
  };
```

(d) Remplacer le bouton vidéo désactivé :
```tsx
              <button type="button" className="btn ghost" disabled title="L'export vidéo arrive en Phase 5b">🎬 Vidéo (bientôt)</button>
```
par :
```tsx
              <button type="button" className="btn" disabled={exporting} onClick={runVideo}>
                {videoProgress !== null ? `🎬 Rendu… ${Math.round(videoProgress * 100)} %` : "🎬 Vidéo"}
              </button>
```

(e) Passer le timing à `FormatInspector`. Remplacer :
```tsx
              {tab === "format" && (
                <FormatInspector
                  formatLabel={formatLabel(doc.type, doc.format)}
                  contentMargin={doc.contentMargin}
                  blockPosition={doc.blockPosition}
                  onChangeContentMargin={(cm: ContentMargin) => setDoc({ ...doc, contentMargin: cm })}
                  onChangeBlockPosition={(p: BlockPosition) => setDoc({ ...doc, blockPosition: p })}
                />
              )}
```
par :
```tsx
              {tab === "format" && (
                <FormatInspector
                  formatLabel={formatLabel(doc.type, doc.format)}
                  contentMargin={doc.contentMargin}
                  blockPosition={doc.blockPosition}
                  onChangeContentMargin={(cm: ContentMargin) => setDoc({ ...doc, contentMargin: cm })}
                  onChangeBlockPosition={(p: BlockPosition) => setDoc({ ...doc, blockPosition: p })}
                  timing={doc.type === "story" ? doc.timing : undefined}
                  onChangeTiming={doc.type === "story" ? (t) => setDoc({ ...doc, timing: t }) : undefined}
                />
              )}
```

> `Timing` n'a pas besoin d'être importé dans `Editor.tsx` : le type de `t` est inféré depuis la prop `onChangeTiming` de `FormatInspector`.

- [ ] **Step 2 : Build complet (tsc + vite)**

Run: `npm run build`
Expected: succès, aucune erreur TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add app/src/pages/Editor.tsx
git commit -m "feat(editor): bouton Vidéo actif (story) + curseurs timing dans l'onglet Format"
```

---

## Task 6 : Vérification end-to-end

- [ ] **Step 1 : Suite de tests + build**

Run: `npm test && npm run build`
Expected: tous les tests PASS (les 78 existants + les nouveaux de model/anim), build vert.

- [ ] **Step 2 : Vérification navigateur (rendu vidéo réel)**

```bash
npm run build
NODE_ENV=production PORT=4321 node server/index.js &
SERVER_PID=$!
sleep 1
```

Sur `http://localhost:4321` (Puppeteer) :
1. Créer une **Story** (« + Nouveau » → 📱 Story). Ajouter 2–3 slides avec du texte et un fond couleur différent par slide (onglet Fond, portée slide) pour bien voir les fondus.
2. Ouvrir l'onglet **Format** : vérifier la présence des curseurs **Durée par slide** et **Transition** (absents pour un Post — le vérifier en ouvrant un Post).
3. Vérifier que la topbar affiche **🎬 Vidéo** (actif), et **pas** « bientôt ».
4. **Vérification du pipeline d'enregistrement sans dépendre du téléchargement** (Puppeteer `evaluate`) — confirmer que `captureStream` + `MediaRecorder` produisent des données non vides dans cet environnement :
```js
await (async () => {
  const c = document.createElement('canvas'); c.width = 320; c.height = 180;
  const ctx = c.getContext('2d');
  const mimes = ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'];
  const mime = mimes.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  const stream = c.captureStream(30);
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(res => (rec.onstop = res));
  rec.start();
  let i = 0;
  await new Promise(res => {
    const id = setInterval(() => {
      ctx.fillStyle = i % 2 ? '#4e7a63' : '#c9836a'; ctx.fillRect(0,0,320,180);
      if (++i > 15) { clearInterval(id); res(); }
    }, 33);
  });
  rec.stop(); await done;
  const blob = new Blob(chunks, { type: mime || 'video/webm' });
  return { mime, bytes: blob.size };
})();
```
   Expected : `{ mime: "video/…", bytes: > 1000 }` — confirme que la chaîne canvas→MediaRecorder→Blob fonctionne (le `mime` retenu indique MP4 ou repli WebM selon le navigateur).
5. Cliquer **🎬 Vidéo** : le libellé passe à **🎬 Rendu… N %**, puis un fichier `<titre>.mp4` (ou `.webm`) est téléchargé. Ouvrir la vidéo : les slides s'enchaînent par fondus et **la vidéo se termine sur la dernière image (texte visible, pas de disparition)**.
6. Régler **Transition** à 0 → réexporter : les slides se coupent franchement (pas de fondu), l'image finale reste figée.

```bash
kill $SERVER_PID
```

- [ ] **Step 3 : Commit** (uniquement si des correctifs ont été nécessaires).

---

## Definition of Done (Phase 5b)

- Une **Story** s'exporte en **vidéo** (bouton 🎬 Vidéo) : MP4 H.264 si le navigateur le supporte, repli WebM sinon ; 1080×1920 ; téléchargée depuis l'éditeur.
- L'animation enchaîne les slides par **fondus enchaînés** (`in → hold → (cross → hold)×N`) **sans fondu sortant** — la vidéo **se termine sur la dernière image figée** (le texte ne disparaît pas).
- L'onglet **Format** propose, pour la story uniquement, des curseurs **Durée par slide** (défaut 4.5 s) et **Transition** (défaut 0.7 s, 0 = coupe franche), persistés dans le modèle (`timing`).
- Le rendu vidéo réutilise le moteur de la Phase 5a (`loadResources`, `renderSlideToCanvas`) : chaque frame **est** l'aperçu (fond + texte + logo).
- La logique d'animation (`anim.ts`) et le champ `timing` sont **couverts par des tests unitaires** ; `npm test` vert ; `npm run build` vert.
- Reste pour la **Phase 6** : onglet Marque, planning, modèles, annuler/rétablir, glisser-déposer, zones de sécurité/alerte de débordement, archivage serveur des exports.
```
