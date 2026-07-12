import type { CSSProperties } from "react";
import type { Line, LineStyleKey } from "@/lib/model";
import { DEFAULT_STYLES, STYLE_KEYS } from "@/lib/model";

const inspBtn: CSSProperties = {
  border: "1px solid var(--line)", background: "#fff", borderRadius: 6, cursor: "pointer",
  width: 26, height: 26, fontSize: 12, color: "var(--muted)", padding: 0,
};

export function ContentInspector({
  lines, onChangeText, onChangeStyle, onAdd, onDelete, onMove,
}: {
  lines: Line[];
  onChangeText: (id: string, text: string) => void;
  onChangeStyle: (id: string, style: LineStyleKey) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  return (
    <div style={{ width: 260, borderLeft: "1px solid var(--line)", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ padding: "12px 12px 6px", fontWeight: 800, color: "var(--sage-deep)", fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px" }}>Contenu</div>
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {lines.map((ln) => (
          <div key={ln.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 8, background: "#fbfdfc", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select className="select" style={{ flex: 1, padding: "5px 6px", fontSize: 12 }} value={ln.style} onChange={(e) => onChangeStyle(ln.id, e.target.value as LineStyleKey)}>
                {STYLE_KEYS.map((k) => (
                  <option key={k} value={k}>{DEFAULT_STYLES[k].label}</option>
                ))}
              </select>
              <button type="button" onClick={() => onMove(ln.id, -1)} style={inspBtn} title="Monter">↑</button>
              <button type="button" onClick={() => onMove(ln.id, 1)} style={inspBtn} title="Descendre">↓</button>
              <button type="button" onClick={() => onDelete(ln.id)} style={{ ...inspBtn, color: "var(--terracotta-ink)" }} title="Supprimer">✕</button>
            </div>
            <textarea
              className="input"
              style={{ padding: "8px 10px", fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 38, lineHeight: 1.4 }}
              rows={2}
              value={ln.text}
              placeholder="Texte de la ligne… (Entrée = nouvelle ligne)"
              onChange={(e) => onChangeText(ln.id, e.target.value)}
            />
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={onAdd} style={{ fontSize: 13 }}>+ Ajouter une ligne</button>
      </div>
    </div>
  );
}
