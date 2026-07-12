import { useRef } from "react";
import type { LogoPlacement, Anchor } from "@/lib/model";
import { ANCHORS, newLogoPlacement } from "@/lib/model";
import type { ImageAsset } from "@/lib/api";

const label: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800, margin: "12px 0 4px" };
const seg = (active: boolean): React.CSSProperties => ({ flex: 1, padding: "6px 0", fontSize: 12, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", border: active ? "1.5px solid var(--sage)" : "1px solid var(--line)", background: active ? "#e3efe7" : "#fff", color: "var(--ink)" });

export function LogoInspector({
  logos, onChange, logoAssets, onUpload, onDeleteAsset, scope, onScopeChange, isSlideOverride, onClearSlide,
}: {
  logos: LogoPlacement[];
  onChange: (logos: LogoPlacement[]) => void;
  logoAssets: ImageAsset[];
  onUpload: (file: File) => void;
  onDeleteAsset: (ref: string) => void;
  scope: "story" | "slide";
  onScopeChange: (s: "story" | "slide") => void;
  isSlideOverride: boolean;
  onClearSlide: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const logo = logos[0] ?? null;
  const setLogo = (next: LogoPlacement | null) => onChange(next ? [next] : []);
  const patch = (p: Partial<LogoPlacement>) => { if (logo) setLogo({ ...logo, ...p }); };
  const useAsset = (ref: string) => setLogo(logo ? { ...logo, logoRef: ref } : newLogoPlacement(ref));
  const toggleAnchor = (a: Anchor) => {
    if (!logo) return;
    const on = logo.anchors.includes(a);
    setLogo({ ...logo, free: null, anchors: on ? logo.anchors.filter((x) => x !== a) : [...logo.anchors, a] });
  };

  return (
    <div style={{ width: 260, borderLeft: "1px solid var(--line)", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto", padding: 12 }}>
      <div style={{ fontWeight: 800, color: "var(--sage-deep)", fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Logo</div>

      <div style={label}>Appliquer à</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" style={seg(scope === "story")} onClick={() => onScopeChange("story")}>Toute la story</button>
        <button type="button" style={seg(scope === "slide")} onClick={() => onScopeChange("slide")}>Ce slide</button>
      </div>
      {scope === "slide" && isSlideOverride && (
        <button type="button" className="btn ghost" style={{ fontSize: 12, marginTop: 6 }} onClick={onClearSlide}>↺ Revenir aux logos de la story</button>
      )}

      <div style={label}>Logo</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {logoAssets.map((a) => (
          <div key={a.ref} style={{ position: "relative" }}>
            <button type="button" onClick={() => useAsset(a.ref)} title="Utiliser ce logo"
              style={{ width: "100%", aspectRatio: "1", borderRadius: 8, backgroundImage: `url(${a.url})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundColor: "#eef4f1", cursor: "pointer", border: logo?.logoRef === a.ref ? "2px solid var(--sage)" : "1px solid var(--line)" }} />
            <button type="button" title="Supprimer" onClick={() => onDeleteAsset(a.ref)}
              style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: 5, border: "none", background: "rgba(0,0,0,.5)", color: "#fff", fontSize: 10, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
        ))}
        <button type="button" onClick={() => fileRef.current?.click()} title="Ajouter un logo"
          style={{ aspectRatio: "1", borderRadius: 8, border: "1.5px dashed var(--sage-light)", background: "#f4faf8", color: "var(--sage-deep)", cursor: "pointer", fontSize: 20 }}>＋</button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />

      {logo && (
        <>
          {logos.length > 0 && (
            <button type="button" className="btn ghost" style={{ fontSize: 12, marginTop: 6 }} onClick={() => setLogo(null)}>Retirer le logo</button>
          )}

          <div style={label}>Emplacements (un ou plusieurs)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 30px)", gap: 4 }}>
            {ANCHORS.map((a) => {
              const on = !logo.free && logo.anchors.includes(a);
              return (
                <button key={a} type="button" title={a} onClick={() => toggleAnchor(a)}
                  style={{ width: 30, height: 30, borderRadius: 6, cursor: "pointer", border: on ? "1.5px solid var(--sage)" : "1px solid var(--line)", background: on ? "#e3efe7" : "#fff", color: "var(--sage-deep)", fontSize: 12 }}>●</button>
              );
            })}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, color: "var(--ink)", cursor: "pointer" }}>
            <input type="checkbox" checked={!!logo.free} onChange={(e) => patch(e.target.checked ? { free: { x: 0.8, y: 0.9 } } : { free: null })} />
            Position libre
          </label>
          {logo.free && (
            <div style={{ marginTop: 4 }}>
              <div style={label}>Horizontal — {Math.round(logo.free.x * 100)} %</div>
              <input type="range" min={0} max={1} step={0.01} value={logo.free.x} onChange={(e) => patch({ free: { x: Number(e.target.value), y: logo.free!.y } })} style={{ width: "100%", accentColor: "var(--sage)" }} />
              <div style={label}>Vertical — {Math.round(logo.free.y * 100)} %</div>
              <input type="range" min={0} max={1} step={0.01} value={logo.free.y} onChange={(e) => patch({ free: { x: logo.free!.x, y: Number(e.target.value) } })} style={{ width: "100%", accentColor: "var(--sage)" }} />
            </div>
          )}

          <div style={label}>Taille — {Math.round(logo.size * 100)} % de la largeur</div>
          <input type="range" min={0.04} max={0.4} step={0.01} value={logo.size} onChange={(e) => patch({ size: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--sage)" }} />

          <div style={label}>Opacité — {Math.round(logo.opacity * 100)} %</div>
          <input type="range" min={0.1} max={1} step={0.05} value={logo.opacity} onChange={(e) => patch({ opacity: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--sage)" }} />
        </>
      )}
    </div>
  );
}
