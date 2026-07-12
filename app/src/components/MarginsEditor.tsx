import type { Margins } from "@/lib/model";

const box: React.CSSProperties = { width: "100%", padding: "5px 6px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 8, fontFamily: "inherit" };
const cell: React.CSSProperties = { fontSize: 10, color: "var(--muted)", textAlign: "center" };

export function MarginsEditor({ margins, onChange }: { margins: Margins; onChange: (m: Margins) => void }) {
  const toggleLink = () => {
    if (!margins.linked) {
      const v = margins.top;
      onChange({ linked: true, top: v, right: v, bottom: v, left: v });
    } else {
      onChange({ ...margins, linked: false });
    }
  };
  const setAll = (v: number) => onChange({ linked: true, top: v, right: v, bottom: v, left: v });
  const setSide = (side: "top" | "right" | "bottom" | "left", v: number) => onChange({ ...margins, [side]: v });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800 }}>Marges (px)</span>
        <button type="button" onClick={toggleLink} title={margins.linked ? "Délier" : "Lier"}
          style={{ border: "1px solid var(--line)", background: margins.linked ? "#e3efe7" : "#fff", borderRadius: 999, padding: "2px 9px", fontSize: 11, cursor: "pointer", color: "var(--sage-deep)" }}>
          {margins.linked ? "🔗 Liées" : "⛓️‍💥 Déliées"}
        </button>
      </div>
      {margins.linked ? (
        <input type="number" style={box} value={margins.top} onChange={(e) => setAll(Number(e.target.value) || 0)} aria-label="Marge (toutes)" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
          <div><div style={cell}>haut</div><input type="number" style={box} value={margins.top} onChange={(e) => setSide("top", Number(e.target.value) || 0)} /></div>
          <div><div style={cell}>bas</div><input type="number" style={box} value={margins.bottom} onChange={(e) => setSide("bottom", Number(e.target.value) || 0)} /></div>
          <div><div style={cell}>gche</div><input type="number" style={box} value={margins.left} onChange={(e) => setSide("left", Number(e.target.value) || 0)} /></div>
          <div><div style={cell}>drte</div><input type="number" style={box} value={margins.right} onChange={(e) => setSide("right", Number(e.target.value) || 0)} /></div>
        </div>
      )}
    </div>
  );
}
