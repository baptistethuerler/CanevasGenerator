import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background, Overlay, Crop } from "../model";
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
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): { addColorStop(offset: number, color: string): void };
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): { addColorStop(offset: number, color: string): void };
  filter: string;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
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

export function drawSlide(
  ctx: DrawCtx,
  slide: Slide,
  styles: Record<LineStyleKey, StyleDef>,
  opts: { dims: Dims; background: Background; contentMargin: ContentMargin; blockPosition: BlockPosition; image?: ImageLike | null },
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
