import type { ContentMargin, BlockPosition } from "@/lib/model";
import { MarginsEditor } from "./MarginsEditor";

const label: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800, margin: "10px 0 4px" };

export function FormatInspector({
  formatLabel, contentMargin, blockPosition, onChangeContentMargin, onChangeBlockPosition,
}: {
  formatLabel: string;
  contentMargin: ContentMargin;
  blockPosition: BlockPosition;
  onChangeContentMargin: (m: ContentMargin) => void;
  onChangeBlockPosition: (p: BlockPosition) => void;
}) {
  return (
    <div style={{ width: 260, borderLeft: "1px solid var(--line)", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto", padding: 12 }}>
      <div style={{ fontWeight: 800, color: "var(--sage-deep)", fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Format</div>

      <div style={label}>Format de sortie</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{formatLabel}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Le changement de format arrivera avec l'export.</div>

      <div style={{ marginTop: 12 }}>
        <MarginsEditor margins={contentMargin} onChange={onChangeContentMargin} />
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Marge de contenu (zone de sécurité, 50 px par défaut).</div>

      <div style={label}>Position du bloc</div>
      <div style={{ display: "flex", gap: 6 }}>
        {(["top", "center", "bottom"] as const).map((p) => (
          <button key={p} type="button" onClick={() => onChangeBlockPosition(p)}
            style={{ flex: 1, padding: "6px 0", fontSize: 12, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              border: blockPosition === p ? "1.5px solid var(--sage)" : "1px solid var(--line)", background: blockPosition === p ? "#e3efe7" : "#fff", color: "var(--ink)" }}>
            {p === "top" ? "Haut" : p === "center" ? "Centre" : "Bas"}
          </button>
        ))}
      </div>
    </div>
  );
}
