import { useState } from "react";
import type { LineStyleKey, StyleDef } from "@/lib/model";
import { STYLE_KEYS, DEFAULT_STYLES, FONT_CHOICES, COLOR_CHOICES } from "@/lib/model";
import { MarginsEditor } from "./MarginsEditor";

const field: React.CSSProperties = { width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 8, fontFamily: "inherit", background: "#fff" };
const label: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800, margin: "10px 0 4px" };

export function TextInspector({
  styles, onChangeStyle,
}: {
  styles: Record<LineStyleKey, StyleDef>;
  onChangeStyle: (key: LineStyleKey, next: StyleDef) => void;
}) {
  const [key, setKey] = useState<LineStyleKey>("title");
  const st = styles[key];
  const set = (patch: Partial<StyleDef>) => onChangeStyle(key, { ...st, ...patch });

  return (
    <div style={{ width: 260, borderLeft: "1px solid var(--line)", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto", padding: 12 }}>
      <div style={{ fontWeight: 800, color: "var(--sage-deep)", fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Texte</div>

      <div style={label}>Style à régler</div>
      <select style={field} value={key} onChange={(e) => setKey(e.target.value as LineStyleKey)}>
        {STYLE_KEYS.map((k) => (<option key={k} value={k}>{DEFAULT_STYLES[k].label}</option>))}
      </select>

      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={label}>Police</div>
          <select style={field} value={st.font} onChange={(e) => set({ font: e.target.value })}>
            {FONT_CHOICES.map((f) => (<option key={f} value={f}>{f}</option>))}
          </select>
        </div>
        <div style={{ width: 70 }}>
          <div style={label}>Corps</div>
          <input type="number" style={field} value={st.size} onChange={(e) => set({ size: Number(e.target.value) || 1 })} />
        </div>
      </div>

      <div style={label}>Couleur</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {COLOR_CHOICES.map((c) => (
          <button key={c} type="button" onClick={() => set({ color: c })} title={c}
            style={{ width: 22, height: 22, borderRadius: 6, background: c, cursor: "pointer", border: st.color === c ? "2px solid var(--sage)" : "1px solid var(--line)" }} />
        ))}
      </div>

      <div style={label}>Alignement</div>
      <div style={{ display: "flex", gap: 6 }}>
        {(["left", "center"] as const).map((a) => (
          <button key={a} type="button" onClick={() => set({ align: a })}
            style={{ flex: 1, padding: "6px 0", fontSize: 12, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              border: st.align === a ? "1.5px solid var(--sage)" : "1px solid var(--line)", background: st.align === a ? "#e3efe7" : "#fff", color: "var(--ink)" }}>
            {a === "left" ? "⯇ Gauche" : "≡ Centré"}
          </button>
        ))}
      </div>

      <div style={label}>Interligne</div>
      <input type="number" step="0.05" style={field} value={st.lineHeight} onChange={(e) => set({ lineHeight: Number(e.target.value) || 1 })} />

      <div style={{ marginTop: 10 }}>
        <MarginsEditor margins={st.margins} onChange={(margins) => set({ margins })} />
      </div>
    </div>
  );
}
