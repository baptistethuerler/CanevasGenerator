import type { Line, LineStyleKey, StyleDef } from "../model";
import { mergeStyle } from "../model";

export type Measure = (text: string, font: string) => number;

export function fontString(st: StyleDef): string {
  return `600 ${st.size}px ${st.font}, Georgia, serif`;
}

/** Chaîne de police d'un segment : gras → Erode Semibold (ou graisse 800 pour les autres polices). */
export function runFontString(st: StyleDef, bold: boolean): string {
  if (!bold) return fontString(st);
  const fam = st.font.startsWith("Erode") ? "Erode Semibold" : st.font;
  return `800 ${st.size}px ${fam}, Georgia, serif`;
}

/** Repli simple (sans gras), conservé pour compatibilité/tests. Les \n sont honorés. */
export function wrapText(text: string, maxWidth: number, measure: (t: string) => number): string[] {
  const out: string[] = [];
  for (const para of String(text).split("\n")) {
    const words = para.split(/[ \t]+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      const candidate = cur ? cur + " " + w : w;
      if (measure(candidate) > maxWidth && cur) { out.push(cur); cur = w; }
      else cur = candidate;
    }
    out.push(cur);
  }
  return out.length ? out : [""];
}

export interface Run { text: string; bold: boolean; }
export type VisualLine = Run[];

/** Découpe un texte en segments normal/gras selon les marqueurs **…**. */
export function parseBold(text: string): Run[] {
  const parts = String(text).split("**");
  const segs: Run[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) segs.push({ text: parts[i], bold: i % 2 === 1 });
  }
  return segs;
}

interface Tok { text: string; bold: boolean; space: boolean; }

function wrapSegments(segments: Run[], maxWidth: number, measure: (t: string, bold: boolean) => number): VisualLine[] {
  const toks: Tok[] = [];
  for (const seg of segments) {
    for (const piece of seg.text.split(/(\s+)/)) {
      if (piece === "") continue;
      toks.push({ text: piece, bold: seg.bold, space: /^\s+$/.test(piece) });
    }
  }
  const width = (t: Tok) => measure(t.text, t.bold);
  const lines: Tok[][] = [];
  let cur: Tok[] = [];
  let curW = 0;
  for (const tok of toks) {
    if (tok.space) {
      if (cur.length === 0) continue; // pas d'espace en début de ligne
      cur.push(tok); curW += width(tok);
      continue;
    }
    const w = width(tok);
    if (curW + w > maxWidth && cur.length > 0) {
      while (cur.length && cur[cur.length - 1].space) { curW -= width(cur[cur.length - 1]); cur.pop(); }
      lines.push(cur); cur = []; curW = 0;
    }
    cur.push(tok); curW += w;
  }
  while (cur.length && cur[cur.length - 1].space) cur.pop();
  lines.push(cur);
  // Fusionne les jetons voisins de même graisse en segments contigus.
  return lines.map((line) => {
    const runs: Run[] = [];
    for (const t of line) {
      const last = runs[runs.length - 1];
      if (last && last.bold === t.bold) last.text += t.text;
      else runs.push({ text: t.text, bold: t.bold });
    }
    return runs.length ? runs : [{ text: "", bold: false }];
  });
}

/** Replie un texte (marqueurs **gras** + retours à la ligne \n) en lignes visuelles de segments. */
export function wrapRich(text: string, maxWidth: number, measure: (t: string, bold: boolean) => number): VisualLine[] {
  const out: VisualLine[] = [];
  for (const para of String(text).split("\n")) {
    const segs = parseBold(para);
    if (segs.length === 0) { out.push([{ text: "", bold: false }]); continue; }
    for (const vl of wrapSegments(segs, maxWidth, measure)) out.push(vl);
  }
  return out.length ? out : [[{ text: "", bold: false }]];
}

export interface LayoutBlock {
  line: Line;
  style: StyleDef;
  font: string;
  wrapped: VisualLine[];
  lineHeight: number;
  markWidth: number;
  height: number;
  gapBefore: number;
  gapAfter: number;
}

export interface SlideLayout {
  blocks: LayoutBlock[];
  totalHeight: number;
}

export function layoutSlide(
  lines: Line[],
  styles: Record<LineStyleKey, StyleDef>,
  opts: { contentWidth: number; measure: Measure },
): SlideLayout {
  const { contentWidth, measure } = opts;
  const blocks: LayoutBlock[] = [];
  let total = 0;
  lines.forEach((ln, i) => {
    const st = mergeStyle(styles[ln.style] ?? styles.text, ln.override);
    const font = fontString(st);
    const markWidth = st.mark ? measure(st.mark + "  ", font) : 0;
    const avail = contentWidth - st.margins.left - st.margins.right - markWidth;
    const wrapped = wrapRich(ln.text, avail, (t, bold) => measure(t, runFontString(st, bold)));
    const lineHeight = st.size * st.lineHeight;
    const height = wrapped.length * lineHeight;
    const gapBefore = i === 0 ? 0 : st.margins.top;
    const gapAfter = st.margins.bottom;
    blocks.push({ line: ln, style: st, font, wrapped, lineHeight, markWidth, height, gapBefore, gapAfter });
    total += gapBefore + height + gapAfter;
  });
  return { blocks, totalHeight: total };
}
