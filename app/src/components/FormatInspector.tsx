import type { ContentMargin, BlockPosition, Timing } from "@/lib/model";
import { MarginsEditor } from "./MarginsEditor";

const label: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 800, margin: "10px 0 4px" };

export function FormatInspector({
  formatLabel, contentMargin, blockPosition, onChangeContentMargin, onChangeBlockPosition,
  timing, onChangeTiming,
}: {
  formatLabel: string;
  contentMargin: ContentMargin;
  blockPosition: BlockPosition;
  onChangeContentMargin: (m: ContentMargin) => void;
  onChangeBlockPosition: (p: BlockPosition) => void;
  timing?: Timing;
  onChangeTiming?: (t: Timing) => void;
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([
          ["top", "Haut"],
          ["golden-top", "Règle d'or ↑"],
          ["center", "Centre"],
          ["golden-bottom", "Règle d'or ↓"],
          ["bottom", "Bas"],
        ] as const).map(([p, lbl]) => (
          <button key={p} type="button" onClick={() => onChangeBlockPosition(p)}
            style={{ flex: "1 0 30%", padding: "6px 4px", fontSize: 11, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              border: blockPosition === p ? "1.5px solid var(--sage)" : "1px solid var(--line)", background: blockPosition === p ? "#e3efe7" : "#fff", color: "var(--ink)" }}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>« Règle d'or » place le texte sur la ligne d'or (haute ou basse) pour une composition équilibrée.</div>

      {timing && onChangeTiming && (
        <>
          <div style={label}>Animation vidéo</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink)" }}>
            <span>Durée par slide</span><span style={{ fontWeight: 700 }}>{timing.duration.toFixed(1)} s</span>
          </div>
          <input type="range" min={1.5} max={8} step={0.5} value={timing.duration}
            onChange={(e) => onChangeTiming({ ...timing, duration: Number(e.target.value) })}
            style={{ width: "100%" }} aria-label="Durée par slide" />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink)", marginTop: 8 }}>
            <span>Transition</span><span style={{ fontWeight: 700 }}>{timing.transition.toFixed(1)} s</span>
          </div>
          <input type="range" min={0} max={2} step={0.1} value={timing.transition}
            onChange={(e) => onChangeTiming({ ...timing, transition: Number(e.target.value) })}
            style={{ width: "100%" }} aria-label="Transition" />
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>La vidéo se termine sur la dernière image figée.</div>
        </>
      )}
    </div>
  );
}
