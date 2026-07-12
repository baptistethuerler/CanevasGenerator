import { useEffect, useRef, useState } from "react";
import type { Slide, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background, LogoPlacement, IconSettings } from "@/lib/model";
import { DEFAULT_STYLES, defaultContentMargin, defaultBackground, defaultIcons, iconUrl } from "@/lib/model";
import { drawSlide, dimsFor } from "@/lib/renderer/draw";

export function CanvasPreview({
  slide, format, styles, contentMargin, blockPosition, background, logos, icons,
}: {
  slide: Slide | null;
  format: string;
  styles?: Record<LineStyleKey, StyleDef>;
  contentMargin?: ContentMargin;
  blockPosition?: BlockPosition;
  background?: Background;
  logos?: LogoPlacement[];
  icons?: IconSettings;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dims = dimsFor(format);
  const st = styles ?? DEFAULT_STYLES;
  const cm = contentMargin ?? defaultContentMargin();
  const bp = blockPosition ?? "center";
  const bg = background ?? defaultBackground();
  const logoList = logos ?? [];

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const wantImage = bg.kind === "image" && !!bg.imageRef;

  const [logoImgs, setLogoImgs] = useState<Record<string, HTMLImageElement>>({});
  const logoRefsKey = logoList.map((l) => l.logoRef).join(",");

  const ic = icons ?? defaultIcons();
  const [iconImgs, setIconImgs] = useState<Record<string, HTMLImageElement>>({});
  const iconUrls = (slide?.lines ?? []).filter((l) => l.icon).map((l) => iconUrl(l.icon!, ic.stroke));
  const iconUrlsKey = iconUrls.join(",");

  useEffect(() => {
    if (!wantImage) { setImg(null); return; }
    const image = new Image();
    let cancelled = false;
    image.onload = () => { if (!cancelled) setImg(image); };
    image.onerror = () => { if (!cancelled) setImg(null); };
    image.src = `/images/${bg.imageRef}`;
    return () => { cancelled = true; };
  }, [wantImage, bg.imageRef]);

  // Charge les images de logo manquantes.
  useEffect(() => {
    const refs = [...new Set(logoList.map((l) => l.logoRef))];
    let cancelled = false;
    for (const r of refs) {
      if (logoImgs[r]) continue;
      const image = new Image();
      image.onload = () => { if (!cancelled) setLogoImgs((m) => ({ ...m, [r]: image })); };
      image.src = `/logos/${r}`;
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoRefsKey]);

  // Charge les icônes manquantes (SVG servis depuis /icons).
  useEffect(() => {
    let cancelled = false;
    for (const u of [...new Set(iconUrls)]) {
      if (iconImgs[u]) continue;
      const image = new Image();
      image.onload = () => { if (!cancelled) setIconImgs((m) => ({ ...m, [u]: image })); };
      image.src = u;
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iconUrlsKey]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      if (slide) {
        drawSlide(ctx, slide, st, { dims, background: bg, contentMargin: cm, blockPosition: bp, image: img, logos: logoList, logoImages: logoImgs, icons: ic, iconImages: iconImgs });
      } else {
        ctx.clearRect(0, 0, dims.width, dims.height);
      }
    });
    return () => { cancelled = true; };
  }, [slide, st, cm, bp, bg, img, logoList, logoImgs, iconImgs, ic.stroke, ic.scale, dims.width, dims.height, dims.margin]);

  return (
    <canvas
      ref={ref}
      width={dims.width}
      height={dims.height}
      style={{ height: "min(72vh, 720px)", width: "auto", borderRadius: 16, boxShadow: "var(--shadow)", display: "block" }}
    />
  );
}
