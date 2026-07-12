import { useEffect, useRef, useState } from "react";
import { getDoc, updateDoc, listImages, uploadImage, deleteImage, listLogos, uploadLogo, deleteLogo, type ImageAsset } from "@/lib/api";
import {
  newSlide, newLine, uid, ensureDocDefaults, effectiveBackground, effectiveLogos,
  type LineStyleKey, type StyleDef, type ContentMargin, type BlockPosition, type ResolvedDoc, type Background, type LogoPlacement,
} from "@/lib/model";
import { CanvasPreview } from "@/components/CanvasPreview";
import { SlidesRail } from "@/components/SlidesRail";
import { ContentInspector } from "@/components/ContentInspector";
import { TextInspector } from "@/components/TextInspector";
import { BackgroundInspector } from "@/components/BackgroundInspector";
import { LogoInspector } from "@/components/LogoInspector";
import { FormatInspector } from "@/components/FormatInspector";
import { exportPostImage, exportCarousel } from "@/lib/export";
import { exportStoryVideo } from "@/lib/video";

type Tab = "contenu" | "texte" | "fond" | "logo" | "format";

function formatLabel(type: string, format: string): string {
  if (type === "post") return format === "4:5" ? "🖼️ Post 1080×1350" : "🖼️ Post 1080×1080";
  return "📱 Story 1080×1920";
}

export function Editor({ id, onBack }: { id: string; onBack: () => void }) {
  const [doc, setDoc] = useState<ResolvedDoc | null>(null);
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<Tab>("contenu");
  const [bgScope, setBgScope] = useState<"story" | "slide">("story");
  const [images, setImages] = useState<ImageAsset[]>([]);
  const refreshImages = () => listImages().then(setImages).catch(() => {});
  useEffect(() => { refreshImages(); }, []);
  const [logoAssets, setLogoAssets] = useState<ImageAsset[]>([]);
  const refreshLogos = () => listLogos().then(setLogoAssets).catch(() => {});
  useEffect(() => { refreshLogos(); }, []);
  const [logoScope, setLogoScope] = useState<"story" | "slide">("story");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const firstLoad = useRef(true);

  useEffect(() => {
    getDoc(id).then((d) => setDoc(ensureDocDefaults(d))).catch((e) => setError(e.message));
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

  const handleBack = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (dirty.current && doc) { dirty.current = false; updateDoc(id, doc).catch(() => {}); }
    onBack();
  };

  const runExport = async (kind: "image" | "carrousel") => {
    if (!doc) return;
    setExporting(true);
    try {
      if (kind === "carrousel") await exportCarousel(doc);
      else await exportPostImage(doc);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const runVideo = async () => {
    if (!doc) return;
    setExporting(true);
    setVideoProgress(0);
    try {
      await exportStoryVideo(doc, (r) => setVideoProgress(r));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
      setVideoProgress(null);
    }
  };

  if (error) return <div className="empty" style={{ padding: 40 }}>Erreur : {error} <button className="btn ghost" onClick={handleBack}>← Retour</button></div>;
  if (!doc) return <div className="empty" style={{ padding: 40 }}>Chargement…</div>;

  const slides = doc.slides;
  const idx = Math.min(active, slides.length - 1);
  const slide = slides[idx] ?? null;

  const setSlides = (next: typeof slides) => setDoc({ ...doc, slides: next });
  const updateSlide = (i: number, fn: (s: typeof slides[number]) => typeof slides[number]) =>
    setSlides(slides.map((s, j) => (j === i ? fn(s) : s)));

  const tabBtn = (t: Tab, lbl: string) => (
    <button type="button" className={`tab${tab === t ? " active" : ""}`} style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => setTab(t)}>{lbl}</button>
  );

  return (
    <div className="app" style={{ gridTemplateColumns: "1fr" }}>
      <div className="content">
        <header className="topbar">
          <button className="btn ghost" onClick={handleBack}>←</button>
          <input className="input" style={{ maxWidth: 240, fontWeight: 800 }} value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} aria-label="Titre" />
          <span className="badge draft">{formatLabel(doc.type, doc.format)}</span>
          <div className="top-actions">
            <span style={{ color: "var(--sage-deep)", fontSize: 13, fontWeight: 700, opacity: saved ? 1 : 0, transition: "opacity .3s" }}>✓ Enregistré</span>
            {doc.type === "post" ? (
              <>
                <button type="button" className="btn" disabled={exporting} onClick={() => runExport("image")}>⤓ Image</button>
                {doc.slides.length > 1 && (
                  <button type="button" className="btn ghost" disabled={exporting} onClick={() => runExport("carrousel")}>⤓ Carrousel</button>
                )}
              </>
            ) : (
              <button type="button" className="btn" disabled={exporting} onClick={runVideo}>
                {videoProgress !== null ? `🎬 Rendu… ${Math.round(videoProgress * 100)} %` : "🎬 Vidéo"}
              </button>
            )}
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

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#eaf1ef", padding: 16 }}>
            <CanvasPreview slide={slide} format={doc.format} styles={doc.styles} contentMargin={doc.contentMargin} blockPosition={doc.blockPosition} background={effectiveBackground(doc, slide)} logos={effectiveLogos(doc, slide)} icons={doc.icons} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--line)", background: "#fff", minWidth: 260 }}>
            <div className="tabs" style={{ margin: 0, padding: "8px 8px 0", gap: 4, borderBottom: "1px solid var(--line)" }}>
              {tabBtn("contenu", "Contenu")}
              {tabBtn("texte", "Texte")}
              {tabBtn("fond", "Fond")}
              {tabBtn("logo", "Logo")}
              {tabBtn("format", "Format")}
            </div>
            <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
              {tab === "contenu" && slide && (
                <ContentInspector
                  lines={slide.lines}
                  onChangeText={(lid, text) => updateSlide(idx, (s) => ({ ...s, lines: s.lines.map((l) => (l.id === lid ? { ...l, text } : l)) }))}
                  onChangeStyle={(lid, style: LineStyleKey) => updateSlide(idx, (s) => ({ ...s, lines: s.lines.map((l) => (l.id === lid ? { ...l, style } : l)) }))}
                  onChangeIcon={(lid, icon) => updateSlide(idx, (s) => ({ ...s, lines: s.lines.map((l) => (l.id === lid ? { ...l, icon } : l)) }))}
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
              {tab === "texte" && (
                <TextInspector
                  styles={doc.styles}
                  onChangeStyle={(key: LineStyleKey, next: StyleDef) => setDoc({ ...doc, styles: { ...doc.styles, [key]: next } })}
                />
              )}
              {tab === "fond" && (
                <BackgroundInspector
                  scope={bgScope}
                  onScopeChange={setBgScope}
                  value={bgScope === "slide" ? (slide?.background ?? doc.background) : doc.background}
                  isSlideOverride={!!(slide && slide.background)}
                  onClearSlide={() => updateSlide(idx, (s) => ({ ...s, background: null }))}
                  images={images}
                  onUpload={(file) => uploadImage(file).then(refreshImages).catch((e) => setError((e as Error).message))}
                  onDeleteImage={(ref) => deleteImage(ref).then(refreshImages).catch(() => {})}
                  onChange={(bg: Background) => {
                    if (bgScope === "slide") updateSlide(idx, (s) => ({ ...s, background: bg }));
                    else setDoc({ ...doc, background: bg });
                  }}
                />
              )}
              {tab === "logo" && (
                <LogoInspector
                  scope={logoScope}
                  onScopeChange={setLogoScope}
                  logos={logoScope === "slide" ? (slide?.logos ?? doc.logos) : doc.logos}
                  isSlideOverride={!!(slide && slide.logos)}
                  onClearSlide={() => updateSlide(idx, (s) => ({ ...s, logos: null }))}
                  logoAssets={logoAssets}
                  onUpload={(file) => uploadLogo(file).then(refreshLogos).catch((e) => setError((e as Error).message))}
                  onDeleteAsset={(ref) => deleteLogo(ref).then(refreshLogos).catch(() => {})}
                  onChange={(next: LogoPlacement[]) => {
                    if (logoScope === "slide") updateSlide(idx, (s) => ({ ...s, logos: next }));
                    else setDoc({ ...doc, logos: next });
                  }}
                />
              )}
              {tab === "format" && (
                <FormatInspector
                  formatLabel={formatLabel(doc.type, doc.format)}
                  contentMargin={doc.contentMargin}
                  blockPosition={doc.blockPosition}
                  onChangeContentMargin={(cm: ContentMargin) => setDoc({ ...doc, contentMargin: cm })}
                  onChangeBlockPosition={(p: BlockPosition) => setDoc({ ...doc, blockPosition: p })}
                  timing={doc.type === "story" ? doc.timing : undefined}
                  onChangeTiming={doc.type === "story" ? (t) => setDoc({ ...doc, timing: t }) : undefined}
                  icons={doc.icons}
                  onChangeIcons={(i) => setDoc({ ...doc, icons: i })}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
