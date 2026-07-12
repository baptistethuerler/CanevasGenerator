import { useEffect, useRef } from "react";
import type { Slide } from "@/lib/model";
import { DEFAULT_STYLES } from "@/lib/model";
import { drawSlide, dimsFor } from "@/lib/renderer/draw";

const DEFAULT_BG = "#4e7a63"; // fond sauge par défaut (fonds/images en Phase 4)

export function CanvasPreview({ slide, format }: { slide: Slide | null; format: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dims = dimsFor(format);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      if (slide) {
        drawSlide(ctx, slide, DEFAULT_STYLES, { dims, background: DEFAULT_BG });
      } else {
        ctx.clearRect(0, 0, dims.width, dims.height);
      }
    });
    return () => { cancelled = true; };
  }, [slide, dims.width, dims.height, dims.margin]);

  return (
    <canvas
      ref={ref}
      width={dims.width}
      height={dims.height}
      style={{ height: "min(72vh, 720px)", width: "auto", borderRadius: 16, boxShadow: "var(--shadow)", display: "block" }}
    />
  );
}
