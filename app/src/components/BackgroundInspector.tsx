import { useRef } from "react";
import type { Background, Overlay, OverlayType, OverlayDirection } from "@/lib/model";
import { BG_COLOR_CHOICES, OVERLAY_COLOR_CHOICES, defaultCrop, defaultFilters } from "@/lib/model";
import type { ImageAsset } from "@/lib/api";

const label: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800, margin: "12px 0 4px" };
const swatch = (c: string, active: boolean): React.CSSProperties => ({ width: 24, height: 24, borderRadius: 6, background: c, cursor: "pointer", border: active ? "2px solid var(--sage)" : "1px solid var(--line)" });
const seg = (active: boolean): React.CSSProperties => ({ flex: 1, padding: "6px 0", fontSize: 12, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", border: active ? "1.5px solid var(--sage)" : "1px solid var(--line)", background: active ? "#e3efe7" : "#fff", color: "var(--ink)" });

export function BackgroundInspector({
  value, onChange, scope, onScopeChange, isSlideOverride, onClearSlide,
  images, onUpload, onDeleteImage,
}: {
  value: Background;
  onChange: (bg: Background) => void;
  scope: "story" | "slide";
  onScopeChange: (s: "story" | "slide") => void;
  isSlideOverride: boolean;
  onClearSlide: () => void;
  images: ImageAsset[];
  onUpload: (file: File) => void;
  onDeleteImage: (ref: string) => void;
}) {
  const setOverlay = (patch: Partial<Overlay>) => onChange({ ...value, overlay: { ...value.overlay, ...patch } });
  const ov = value.overlay;
  const fileRef = useRef<HTMLInputElement>(null);
  const selectImage = (ref: string) => onChange({ ...value, kind: "image", imageRef: ref, crop: value.crop ?? defaultCrop(), filters: value.filters ?? defaultFilters() });

  return (
    <div style={{ width: 260, borderLeft: "1px solid var(--line)", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto", padding: 12 }}>
      <div style={{ fontWeight: 800, color: "var(--sage-deep)", fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Fond</div>

      <div style={label}>Appliquer à</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" style={seg(scope === "story")} onClick={() => onScopeChange("story")}>Toute la story</button>
        <button type="button" style={seg(scope === "slide")} onClick={() => onScopeChange("slide")}>Ce slide</button>
      </div>
      {scope === "slide" && isSlideOverride && (
        <button type="button" className="btn ghost" style={{ fontSize: 12, marginTop: 6 }} onClick={onClearSlide}>↺ Revenir au fond de la story</button>
      )}

      <div style={label}>Type de fond</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" style={seg(value.kind === "color")} onClick={() => onChange({ ...value, kind: "color" })}>🎨 Couleur</button>
        <button type="button" style={seg(value.kind === "image")} onClick={() => onChange({ ...value, kind: "image", crop: value.crop ?? defaultCrop(), filters: value.filters ?? defaultFilters() })}>🖼️ Image</button>
      </div>

      {value.kind === "image" && (
        <>
          <div style={label}>Banque d'images</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {images.map((im) => (
              <div key={im.ref} style={{ position: "relative" }}>
                <button type="button" onClick={() => selectImage(im.ref)} title="Utiliser cette image"
                  style={{ width: "100%", aspectRatio: "1", borderRadius: 8, backgroundImage: `url(${im.url})`, backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer", border: value.imageRef === im.ref ? "2px solid var(--sage)" : "1px solid var(--line)" }} />
                <button type="button" title="Supprimer" onClick={() => onDeleteImage(im.ref)}
                  style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: 5, border: "none", background: "rgba(0,0,0,.5)", color: "#fff", fontSize: 10, cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()} title="Ajouter une image"
              style={{ aspectRatio: "1", borderRadius: 8, border: "1.5px dashed var(--sage-light)", background: "#f4faf8", color: "var(--sage-deep)", cursor: "pointer", fontSize: 20 }}>＋</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Le recadrage, la luminosité et le flou arriveront à l'étape suivante.</div>
        </>
      )}

      <div style={label}>Couleur du fond</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
        {BG_COLOR_CHOICES.map((c) => (
          <button key={c} type="button" title={c} style={swatch(c, value.color === c)} onClick={() => onChange({ ...value, color: c })} />
        ))}
        <input type="color" value={value.color.startsWith("#") ? value.color : "#4e7a63"} onChange={(e) => onChange({ ...value, color: e.target.value })} title="Couleur personnalisée" style={{ width: 28, height: 24, border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer", background: "#fff" }} />
      </div>

      <div style={label}>Voile (lisibilité)</div>
      <div style={{ display: "flex", gap: 6 }}>
        {(["none", "uniform", "gradient"] as OverlayType[]).map((t) => (
          <button key={t} type="button" style={seg(ov.type === t)} onClick={() => setOverlay({ type: t })}>
            {t === "none" ? "Aucun" : t === "uniform" ? "Uniforme" : "Dégradé"}
          </button>
        ))}
      </div>

      {ov.type !== "none" && (
        <>
          {ov.type === "gradient" && (
            <>
              <div style={label}>Direction</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["bottom", "top", "radial"] as OverlayDirection[]).map((d) => (
                  <button key={d} type="button" style={seg(ov.direction === d)} onClick={() => setOverlay({ direction: d })}>
                    {d === "bottom" ? "▼ Bas" : d === "top" ? "▲ Haut" : "◉ Radial"}
                  </button>
                ))}
              </div>
              {ov.direction !== "radial" && (
                <>
                  <div style={label}>Douceur</div>
                  <input type="range" min={0} max={1} step={0.05} value={ov.softness} onChange={(e) => setOverlay({ softness: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--sage)" }} />
                </>
              )}
            </>
          )}

          <div style={label}>Intensité — {Math.round(ov.intensity * 100)} %</div>
          <input type="range" min={0} max={1} step={0.05} value={ov.intensity} onChange={(e) => setOverlay({ intensity: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--sage)" }} />

          <div style={label}>Couleur du voile</div>
          <div style={{ display: "flex", gap: 5 }}>
            {OVERLAY_COLOR_CHOICES.map((c) => (
              <button key={c} type="button" title={c} style={swatch(c, ov.color === c)} onClick={() => setOverlay({ color: c })} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
