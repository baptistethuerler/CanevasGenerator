import type { Slide, LineStyleKey, StyleDef } from "../model";
import { layoutSlide } from "./layout";

export interface Dims {
  width: number;
  height: number;
  margin: number;
}

export const STORY_DIMS: Dims = { width: 1080, height: 1920, margin: 50 };

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
  opts: { dims: Dims; background: string },
): void {
  const { width, height, margin } = opts.dims;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, width, height);

  const contentWidth = width - 2 * margin;
  const layout = layoutSlide(slide.lines, styles, {
    contentWidth,
    measure: (t, f) => {
      ctx.font = f;
      return ctx.measureText(t).width;
    },
  });

  const bandTop = margin;
  const bandBottom = height - margin;
  let y = bandTop + Math.max(0, (bandBottom - bandTop - layout.totalHeight) / 2);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  for (const b of layout.blocks) {
    y += b.gap;
    ctx.font = b.font;
    const firstBaseline = y + b.style.size * 0.8;
    const markX = margin + b.indent;
    const textX = markX + b.markWidth;

    if (b.style.mark) {
      ctx.fillStyle = b.style.color;
      ctx.fillText(b.style.mark, markX, firstBaseline);
    }

    ctx.fillStyle = b.style.color;
    b.wrapped.forEach((tline, k) => {
      ctx.fillText(tline, textX, firstBaseline + k * b.lineHeight);
    });

    y += b.height;
  }
}
