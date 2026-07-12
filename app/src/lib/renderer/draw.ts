import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background, Overlay, Crop, LogoPlacement, Anchor, IconSettings } from "../model";
import { iconUrl } from "../model";
import { layoutSlide, runFontString } from "./layout";

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
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): { addColorStop(offset: number, color: string): void };
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): { addColorStop(offset: number, color: string): void };
  filter: string;
  globalAlpha: number;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
  save(): void;
  restore(): void;
}

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

/** Zone de contenu (marges depuis chaque bord). Aucun logo n'en sort. */
export interface ContentBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function computeLogoRect(
  W: number, H: number, iw: number, ih: number, anchor: Anchor, sizeFrac: number, box: ContentBox,
): { dx: number; dy: number; dw: number; dh: number } {
  const zoneW = W - box.left - box.right;
  const zoneH = H - box.top - box.bottom;
  const dw = zoneW * sizeFrac; // la taille est relative à la largeur de la zone
  const dh = dw * (ih / iw);
  let dx: number;
  if (anchor === "top-left" || anchor === "left" || anchor === "bottom-left") dx = box.left;
  else if (anchor === "top-right" || anchor === "right" || anchor === "bottom-right") dx = W - box.right - dw;
  else dx = box.left + (zoneW - dw) / 2;
  let dy: number;
  if (anchor === "top-left" || anchor === "top" || anchor === "top-right") dy = box.top;
  else if (anchor === "bottom-left" || anchor === "bottom" || anchor === "bottom-right") dy = H - box.bottom - dh;
  else dy = box.top + (zoneH - dh) / 2;
  return { dx, dy, dw, dh };
}

export function drawLogos(
  ctx: DrawCtx,
  logos: LogoPlacement[],
  dims: Dims,
  images: Record<string, ImageLike>,
  box: ContentBox,
): void {
  const zoneW = dims.width - box.left - box.right;
  const zoneH = dims.height - box.top - box.bottom;
  for (const p of logos) {
    const img = images[p.logoRef];
    if (!img) continue;
    ctx.globalAlpha = p.opacity ?? 1;
    if (p.free) {
      const dw = zoneW * p.size;
      const dh = dw * (img.height / img.width);
      // Position libre exprimée dans la zone de contenu (0..1), jamais hors zone.
      const cx = box.left + p.free.x * zoneW;
      const cy = box.top + p.free.y * zoneH;
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    } else {
      for (const a of p.anchors) {
        const { dx, dy, dw, dh } = computeLogoRect(dims.width, dims.height, img.width, img.height, a, p.size, box);
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    }
    ctx.globalAlpha = 1;
  }
}

export function drawSlide(
  ctx: DrawCtx,
  slide: Slide,
  styles: Record<LineStyleKey, StyleDef>,
  opts: { dims: Dims; background: Background; contentMargin: ContentMargin; blockPosition: BlockPosition; image?: ImageLike | null; logos?: LogoPlacement[]; logoImages?: Record<string, ImageLike>; icons?: IconSettings; iconImages?: Record<string, ImageLike> },
): void {
  const { width, height } = opts.dims;
  const cm = opts.contentMargin;

  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, opts.background, opts.dims, opts.image);

  const contentLeft = cm.left;
  const contentRight = width - cm.right;
  const contentWidth = contentRight - contentLeft;

  const layout = layoutSlide(slide.lines, styles, {
    contentWidth,
    iconScale: opts.icons?.scale ?? 1,
    measure: (t, f) => {
      ctx.font = f;
      return ctx.measureText(t).width;
    },
  });

  const bandTop = cm.top;
  const bandBottom = height - cm.bottom;
  // Règle d'or (φ ≈ 1,68) : centre le bloc sur la ligne d'or, haute ou basse,
  // en le maintenant dans la zone de sécurité (marges).
  const PHI = 1.68;
  const clampBand = (top: number) => Math.min(Math.max(bandTop, top), Math.max(bandTop, bandBottom - layout.totalHeight));
  let y: number;
  if (opts.blockPosition === "top") y = bandTop;
  else if (opts.blockPosition === "bottom") y = Math.max(bandTop, bandBottom - layout.totalHeight);
  else if (opts.blockPosition === "golden-top") y = clampBand(height * (1 - 1 / PHI) - layout.totalHeight / 2);
  else if (opts.blockPosition === "golden-bottom") y = clampBand(height * (1 / PHI) - layout.totalHeight / 2);
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

    ctx.fillStyle = st.color;
    const icon = b.line.icon;
    if (icon && opts.iconImages) {
      const img = opts.iconImages[iconUrl(icon, opts.icons?.stroke ?? "trait-2")];
      if (img) {
        const iconSize = st.size * (opts.icons?.scale ?? 1);
        ctx.drawImage(img, markX, firstBaseline - iconSize * 0.82, iconSize, iconSize);
      }
    } else if (st.mark) {
      ctx.font = b.font;
      ctx.fillText(st.mark, markX, firstBaseline);
    }

    b.wrapped.forEach((runs, k) => {
      const baseline = firstBaseline + k * b.lineHeight;
      let lineW = 0;
      for (const r of runs) { ctx.font = runFontString(st, r.bold); lineW += ctx.measureText(r.text).width; }
      let x = st.align === "center" ? (areaLeft + areaRight) / 2 - lineW / 2 : areaLeft;
      for (const r of runs) {
        ctx.font = runFontString(st, r.bold);
        ctx.fillText(r.text, x, baseline);
        x += ctx.measureText(r.text).width;
      }
    });

    y += b.height + b.gapAfter;
  }

  if (opts.logos && opts.logos.length) {
    drawLogos(ctx, opts.logos, opts.dims, opts.logoImages ?? {}, { left: cm.left, top: cm.top, right: cm.right, bottom: cm.bottom });
  }
}
