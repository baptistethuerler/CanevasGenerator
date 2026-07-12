export type LineStyleKey = "title" | "subtitle" | "text" | "bullet" | "arrow" | "note";

export const STYLE_KEYS: LineStyleKey[] = ["title", "subtitle", "text", "bullet", "arrow", "note"];

export interface StyleDef {
  label: string;
  font: string;
  size: number;
  color: string;
  lineHeight: number;
  gapTop: number;
  mark: string | null;
  indent: number;
}

export const DEFAULT_FONT = "Nunito";

export const DEFAULT_STYLES: Record<LineStyleKey, StyleDef> = {
  title: { label: "Titre", font: DEFAULT_FONT, size: 78, color: "#ffffff", lineHeight: 1.12, gapTop: 0, mark: null, indent: 0 },
  subtitle: { label: "Sous-titre", font: DEFAULT_FONT, size: 48, color: "#ffffff", lineHeight: 1.2, gapTop: 52, mark: null, indent: 0 },
  text: { label: "Texte", font: DEFAULT_FONT, size: 39, color: "rgba(255,255,255,.95)", lineHeight: 1.32, gapTop: 24, mark: null, indent: 0 },
  bullet: { label: "Puce", font: DEFAULT_FONT, size: 38, color: "rgba(255,255,255,.95)", lineHeight: 1.3, gapTop: 14, mark: "•", indent: 44 },
  arrow: { label: "Créneau", font: DEFAULT_FONT, size: 42, color: "#eaf5f2", lineHeight: 1.24, gapTop: 10, mark: "→", indent: 44 },
  note: { label: "Note", font: DEFAULT_FONT, size: 31, color: "rgba(255,255,255,.82)", lineHeight: 1.36, gapTop: 40, mark: null, indent: 0 },
};

export interface Line {
  id: string;
  style: LineStyleKey;
  text: string;
}

export interface Slide {
  id: string;
  name?: string;
  lines: Line[];
}

export interface StoryPayload {
  type: "story";
  format: "9:16";
  title: string;
  status: "draft" | "ready";
  date: string;
  slides: Slide[];
}

export function uid(): string {
  return crypto.randomUUID();
}

export function newLine(style: LineStyleKey = "text"): Line {
  return { id: uid(), style, text: "" };
}

export function newSlide(): Slide {
  return { id: uid(), lines: [{ ...newLine("title"), text: "Nouveau slide" }, newLine("text")] };
}

export function newStoryPayload(title = "Nouvelle story"): StoryPayload {
  return {
    type: "story",
    format: "9:16",
    title,
    status: "draft",
    date: new Date().toISOString().slice(0, 10),
    slides: [newSlide()],
  };
}
