import type { Line, LineStyleKey, StyleDef } from "../model";

export type Measure = (text: string, font: string) => number;

export function fontString(st: StyleDef): string {
  return `600 ${st.size}px ${st.font}, Georgia, serif`;
}

export function wrapText(text: string, maxWidth: number, measure: (t: string) => number): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  const out: string[] = [];
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
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

export interface LayoutBlock {
  line: Line;
  style: StyleDef;
  font: string;
  wrapped: string[];
  lineHeight: number;
  indent: number;
  markWidth: number;
  height: number;
  gap: number;
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
    const st = styles[ln.style] ?? styles.text;
    const font = fontString(st);
    const markWidth = st.mark ? measure(st.mark + "  ", font) : 0;
    const avail = contentWidth - st.indent - markWidth;
    const wrapped = wrapText(ln.text, avail, (t) => measure(t, font));
    const lineHeight = st.size * st.lineHeight;
    const height = wrapped.length * lineHeight;
    const gap = i === 0 ? 0 : st.gapTop;
    blocks.push({ line: ln, style: st, font, wrapped, lineHeight, indent: st.indent, markWidth, height, gap });
    total += gap + height;
  });
  return { blocks, totalHeight: total };
}
