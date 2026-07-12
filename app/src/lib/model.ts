export type LineStyleKey = "title" | "subtitle" | "text" | "bullet" | "arrow" | "note";

export const STYLE_KEYS: LineStyleKey[] = ["title", "subtitle", "text", "bullet", "arrow", "note"];

export type Format = "9:16" | "1:1" | "4:5";
export type BlockPosition = "top" | "center" | "bottom";
export type Align = "left" | "center";

export interface Margins {
  linked: boolean;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type ContentMargin = Margins;

export interface StyleDef {
  label: string;
  font: string;
  size: number;
  color: string;
  align: Align;
  lineHeight: number;
  mark: string | null;
  margins: Margins;
}

export const DEFAULT_FONT = "Nunito";
export const FONT_CHOICES = ["Nunito", "Georgia", "Arial"];
export const COLOR_CHOICES = ["#ffffff", "#2f3a34", "#4e7a63", "#c9836a", "#eaf5f2"];

const m = (top: number, left = 0): Margins => ({ linked: false, top, right: 0, bottom: 0, left });

export const DEFAULT_STYLES: Record<LineStyleKey, StyleDef> = {
  title:    { label: "Titre",      font: DEFAULT_FONT, size: 78, color: "#ffffff",                 align: "left", lineHeight: 1.12, mark: null, margins: m(0) },
  subtitle: { label: "Sous-titre", font: DEFAULT_FONT, size: 48, color: "#ffffff",                 align: "left", lineHeight: 1.2,  mark: null, margins: m(52) },
  text:     { label: "Texte",      font: DEFAULT_FONT, size: 39, color: "rgba(255,255,255,.95)",   align: "left", lineHeight: 1.32, mark: null, margins: m(24) },
  bullet:   { label: "Puce",       font: DEFAULT_FONT, size: 38, color: "rgba(255,255,255,.95)",   align: "left", lineHeight: 1.3,  mark: "•",  margins: m(14, 44) },
  arrow:    { label: "Créneau",    font: DEFAULT_FONT, size: 42, color: "#eaf5f2",                 align: "left", lineHeight: 1.24, mark: "→",  margins: m(10, 44) },
  note:     { label: "Note",       font: DEFAULT_FONT, size: 31, color: "rgba(255,255,255,.82)",   align: "left", lineHeight: 1.36, mark: null, margins: m(40) },
};

export interface Line {
  id: string;
  style: LineStyleKey;
  text: string;
  override?: Partial<StyleDef>;
}

export interface Slide {
  id: string;
  name?: string;
  lines: Line[];
}

export interface StoryPayload {
  type: "story" | "post";
  format: Format;
  postMode?: "single" | "carousel";
  title: string;
  status: "draft" | "ready";
  date: string;
  styles: Record<LineStyleKey, StyleDef>;
  contentMargin: ContentMargin;
  blockPosition: BlockPosition;
  slides: Slide[];
}

export interface DocLike {
  id: string;
  type: "story" | "post";
  format: string;
  postMode?: "single" | "carousel";
  title: string;
  status: "draft" | "ready";
  date?: string;
  createdAt: string;
  updatedAt: string;
  styles?: Record<LineStyleKey, StyleDef>;
  contentMargin?: ContentMargin;
  blockPosition?: BlockPosition;
  slides: Slide[];
}

export interface ResolvedDoc extends DocLike {
  styles: Record<LineStyleKey, StyleDef>;
  contentMargin: ContentMargin;
  blockPosition: BlockPosition;
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

export function defaultStyles(): Record<LineStyleKey, StyleDef> {
  return structuredClone(DEFAULT_STYLES);
}

export function defaultContentMargin(): ContentMargin {
  return { linked: true, top: 50, right: 50, bottom: 50, left: 50 };
}

export function mergeStyle(base: StyleDef, override?: Partial<StyleDef>): StyleDef {
  if (!override) return base;
  return { ...base, ...override, margins: { ...base.margins, ...(override.margins ?? {}) } };
}

export function ensureDocDefaults(doc: DocLike): ResolvedDoc {
  return {
    ...doc,
    styles: doc.styles ?? defaultStyles(),
    contentMargin: doc.contentMargin ?? defaultContentMargin(),
    blockPosition: doc.blockPosition ?? "center",
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function baseNew(type: "story" | "post", format: Format, title: string): StoryPayload {
  return {
    type,
    format,
    title,
    status: "draft",
    date: today(),
    styles: defaultStyles(),
    contentMargin: defaultContentMargin(),
    blockPosition: "center",
    slides: [newSlide()],
  };
}

export function newStoryPayload(title = "Nouvelle story"): StoryPayload {
  return baseNew("story", "9:16", title);
}

export function newPostPayload(format: Format = "1:1", title = "Nouveau post"): StoryPayload {
  return { ...baseNew("post", format, title), postMode: "single" };
}
