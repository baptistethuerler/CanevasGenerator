import type { Line, LineStyleKey, StyleDef } from "../model";
import { mergeStyle } from "../model";

export type Measure = (text: string, font: string) => number;

export function fontString(st: StyleDef): string {
  return `600 ${st.size}px ${st.font}, Georgia, serif`;
}

export function wrapText(text: string, maxWidth: number, measure: (t: string) => number): string[] {
  const out: string[] = [];
  // Les retours à la ligne manuels (\n) découpent d'abord en paragraphes,
  // chacun étant ensuite replié automatiquement selon la largeur disponible.
  for (const para of String(text).split("\n")) {
    const words = para.split(/[ \t]+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      const candidate = cur ? cur + " " + w : w;
      if (measure(candidate) > maxWidth && cur) {
        out.push(cur);
        cur = w;
      } else {
        cur = candidate;
      }
    }
    out.push(cur); // conserve les lignes vides (retour à la ligne explicite)
  }
  return out.length ? out : [""];
}

export interface LayoutBlock {
  line: Line;
  style: StyleDef;
  font: string;
  wrapped: string[];
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
    const wrapped = wrapText(ln.text, avail, (t) => measure(t, font));
    const lineHeight = st.size * st.lineHeight;
    const height = wrapped.length * lineHeight;
    const gapBefore = i === 0 ? 0 : st.margins.top;
    const gapAfter = st.margins.bottom;
    blocks.push({ line: ln, style: st, font, wrapped, lineHeight, markWidth, height, gapBefore, gapAfter });
    total += gapBefore + height + gapAfter;
  });
  return { blocks, totalHeight: total };
}
