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
