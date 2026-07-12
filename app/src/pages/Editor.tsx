import { useEffect, useRef, useState } from "react";
import { getDoc, updateDoc, type StoryDoc } from "@/lib/api";
import { newSlide, newLine, uid, type LineStyleKey } from "@/lib/model";
import { CanvasPreview } from "@/components/CanvasPreview";
import { SlidesRail } from "@/components/SlidesRail";
import { ContentInspector } from "@/components/ContentInspector";

export function Editor({ id, onBack }: { id: string; onBack: () => void }) {
  const [doc, setDoc] = useState<StoryDoc | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstLoad = useRef(true);
  const dirty = useRef(false);

  useEffect(() => {
    getDoc(id).then(setDoc).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!doc) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateDoc(id, doc)
        .then(() => { dirty.current = false; setSaved(true); setTimeout(() => setSaved(false), 1200); })
        .catch((e) => setError((e as Error).message));
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [doc, id]);

  // Retour à la bibliothèque : on sauvegarde immédiatement toute édition en attente
  // (sinon un clic dans les 600 ms suivant une frappe perdrait la dernière modification).
  const handleBack = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (dirty.current && doc) {
      dirty.current = false;
      updateDoc(id, doc).catch(() => {});
    }
    onBack();
  };

  if (error) return <div className="empty" style={{ padding: 40 }}>Erreur : {error} <button className="btn ghost" onClick={onBack}>← Retour</button></div>;
  if (!doc) return <div className="empty" style={{ padding: 40 }}>Chargement…</div>;

  const slides = doc.slides;
  const idx = Math.min(active, slides.length - 1);
  const slide = slides[idx] ?? null;

  const setSlides = (next: typeof slides) => setDoc({ ...doc, slides: next });
  const updateSlide = (i: number, fn: (s: typeof slides[number]) => typeof slides[number]) =>
    setSlides(slides.map((s, j) => (j === i ? fn(s) : s)));

  return (
    <div className="app" style={{ gridTemplateColumns: "1fr" }}>
      <div className="content">
        <header className="topbar">
          <button className="btn ghost" onClick={handleBack}>←</button>
          <input
            className="input"
            style={{ maxWidth: 260, fontWeight: 800 }}
            value={doc.title}
            onChange={(e) => setDoc({ ...doc, title: e.target.value })}
            aria-label="Titre de la story"
          />
          <span className="badge draft">📱 Story 1080×1920</span>
          <div className="top-actions">
            <span style={{ color: "var(--sage-deep)", fontSize: 13, fontWeight: 700, opacity: saved ? 1 : 0, transition: "opacity .3s" }}>✓ Enregistré</span>
          </div>
        </header>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <SlidesRail
            slides={slides}
            activeIndex={idx}
            onSelect={setActive}
            onAdd={() => { setSlides([...slides, newSlide()]); setActive(slides.length); }}
            onDuplicate={(i) => {
              const copy = { ...slides[i], id: uid(), lines: slides[i].lines.map((l) => ({ ...l, id: uid() })) };
              setSlides([...slides.slice(0, i + 1), copy, ...slides.slice(i + 1)]);
              setActive(i + 1);
            }}
            onDelete={(i) => {
              if (slides.length <= 1) return;
              const next = slides.filter((_, j) => j !== i);
              setSlides(next);
              setActive(Math.min(idx, next.length - 1));
            }}
            onMove={(i, dir) => {
              const j = i + dir;
              if (j < 0 || j >= slides.length) return;
              const next = [...slides];
              [next[i], next[j]] = [next[j], next[i]];
              setSlides(next);
              setActive(j);
            }}
          />

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#eaf1ef", padding: 16 }}>
            <CanvasPreview slide={slide} />
          </div>

          {slide && (
            <ContentInspector
              lines={slide.lines}
              onChangeText={(lid, text) => updateSlide(idx, (s) => ({ ...s, lines: s.lines.map((l) => (l.id === lid ? { ...l, text } : l)) }))}
              onChangeStyle={(lid, style: LineStyleKey) => updateSlide(idx, (s) => ({ ...s, lines: s.lines.map((l) => (l.id === lid ? { ...l, style } : l)) }))}
              onAdd={() => updateSlide(idx, (s) => ({ ...s, lines: [...s.lines, newLine()] }))}
              onDelete={(lid) => updateSlide(idx, (s) => ({ ...s, lines: s.lines.length > 1 ? s.lines.filter((l) => l.id !== lid) : s.lines }))}
              onMove={(lid, dir) => updateSlide(idx, (s) => {
                const i = s.lines.findIndex((l) => l.id === lid);
                const j = i + dir;
                if (i < 0 || j < 0 || j >= s.lines.length) return s;
                const lines = [...s.lines];
                [lines[i], lines[j]] = [lines[j], lines[i]];
                return { ...s, lines };
              })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
