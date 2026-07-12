import type { CSSProperties } from "react";
import type { Slide } from "@/lib/model";

const miniBtn: CSSProperties = {
  border: "1px solid var(--line)", background: "#fff", borderRadius: 6, cursor: "pointer",
  width: 22, height: 22, fontSize: 12, lineHeight: 1, color: "var(--muted)", padding: 0,
};

export function SlidesRail({
  slides, activeIndex, onSelect, onAdd, onDuplicate, onDelete, onMove,
}: {
  slides: Slide[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
}) {
  return (
    <div style={{ width: 132, borderRight: "1px solid var(--line)", background: "#fbfdfc", padding: 10, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800 }}>Slides</div>
      {slides.map((s, i) => (
        <div key={s.id} style={{ border: `2px solid ${i === activeIndex ? "var(--sage)" : "var(--line)"}`, borderRadius: 8, padding: 6, background: i === activeIndex ? "#f3f8f4" : "#fff", cursor: "pointer" }} onClick={() => onSelect(i)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 800, color: "var(--ink)" }}>
            <span>{i + 1}</span>
            <span style={{ display: "flex", gap: 2 }}>
              <button type="button" title="Monter" onClick={(e) => { e.stopPropagation(); onMove(i, -1); }} style={miniBtn}>↑</button>
              <button type="button" title="Descendre" onClick={(e) => { e.stopPropagation(); onMove(i, 1); }} style={miniBtn}>↓</button>
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.lines.find((l) => l.text)?.text || "—"}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(i); }} style={miniBtn} title="Dupliquer">⧉</button>
            {slides.length > 1 && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(i); }} style={{ ...miniBtn, color: "var(--terracotta-ink)" }} title="Supprimer">✕</button>
            )}
          </div>
        </div>
      ))}
      <button type="button" className="btn ghost" onClick={onAdd} style={{ fontSize: 13, padding: "8px 6px" }}>+ Slide</button>
    </div>
  );
}
