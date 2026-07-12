import { useEffect, useRef } from "react";
import type { Slide } from "@/lib/model";
import { DEFAULT_STYLES } from "@/lib/model";
import { drawSlide, STORY_DIMS } from "@/lib/renderer/draw";

const DEFAULT_BG = "#4e7a63"; // fond sauge par défaut (fonds/images en Phase 4)

export function CanvasPreview({ slide }: { slide: Slide | null }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      if (slide) {
        drawSlide(ctx, slide, DEFAULT_STYLES, { dims: STORY_DIMS, background: DEFAULT_BG });
      } else {
        ctx.clearRect(0, 0, STORY_DIMS.width, STORY_DIMS.height);
      }
    });
    return () => { cancelled = true; };
  }, [slide]);

  return (
    <canvas
      ref={ref}
      width={STORY_DIMS.width}
      height={STORY_DIMS.height}
      style={{ height: "min(72vh, 720px)", width: "auto", borderRadius: 16, boxShadow: "var(--shadow)", display: "block" }}
    />
  );
}
