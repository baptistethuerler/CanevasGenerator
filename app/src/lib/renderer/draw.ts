import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition } from "../model";
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
}

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
