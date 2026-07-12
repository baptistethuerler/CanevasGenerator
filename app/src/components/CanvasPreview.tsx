import { useEffect, useRef } from "react";
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

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      if (slide) {
        drawSlide(ctx, slide, st, { dims, background: bg, contentMargin: cm, blockPosition: bp });
      } else {
        ctx.clearRect(0, 0, dims.width, dims.height);
      }
    });
    return () => { cancelled = true; };
  }, [slide, st, cm, bp, bg, dims.width, dims.height, dims.margin]);

  return (
    <canvas
      ref={ref}
      width={dims.width}
      height={dims.height}
      style={{ height: "min(72vh, 720px)", width: "auto", borderRadius: 16, boxShadow: "var(--shadow)", display: "block" }}
    />
  );
}
