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
