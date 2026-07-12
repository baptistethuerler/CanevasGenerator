export type LineStyleKey = "title" | "subtitle" | "text" | "bullet" | "arrow" | "note";

export const STYLE_KEYS: LineStyleKey[] = ["title", "subtitle", "text", "bullet", "arrow", "note"];

export type Format = "9:16" | "1:1" | "4:5";
export type BlockPosition = "top" | "golden-top" | "center" | "golden-bottom" | "bottom";
export type Align = "left" | "center";

export type OverlayType = "none" | "uniform" | "gradient";
export type OverlayDirection = "bottom" | "top" | "radial";

export interface Overlay {
  type: OverlayType;
  color: string;
  intensity: number;
  direction: OverlayDirection;
  softness: number;
}

export interface Crop {
  zoom: number;
  x: number;
  y: number;
}

export interface Filters {
  brightness: number;
  blur: number;
}

export interface Timing {
  duration: number;   // maintien par slide, en secondes
  transition: number; // durée du fondu enchaîné, en secondes
}

export interface Background {
  kind: "color" | "image";
  color: string;
  imageRef?: string;
  crop?: Crop;
  filters?: Filters;
  overlay: Overlay;
}

export const BG_COLOR_CHOICES = ["#81a9a3", "#6f948d", "#eef4f1", "#fdfbf7", "#33474a", "#ffffff"];
export const OVERLAY_COLOR_CHOICES = ["#33474a", "#000000", "#6f948d", "#ffffff"];

export function defaultOverlay(): Overlay {
  return { type: "none", color: "#000000", intensity: 0.5, direction: "bottom", softness: 0.5 };
}

export function defaultCrop(): Crop {
  return { zoom: 1, x: 0.5, y: 0.5 };
}

export function defaultFilters(): Filters {
  return { brightness: 1, blur: 0 };
}

export function defaultTiming(): Timing {
  return { duration: 4.5, transition: 0.7 };
}

export function defaultBackground(): Background {
  return { kind: "color", color: "#81a9a3", overlay: defaultOverlay() };
}

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

export const DEFAULT_FONT = "Erode Medium";
export const FONT_CHOICES = ["Erode Medium", "Erode Medium Italic", "Erode Semibold", "Erode", "Nunito", "Georgia", "Arial"];
export const COLOR_CHOICES = ["#ffffff", "#fdfbf7", "#33474a", "#81a9a3", "#6f948d", "#a25a4b"];

const m = (top: number, left = 0): Margins => ({ linked: false, top, right: 0, bottom: 0, left });

export const DEFAULT_STYLES: Record<LineStyleKey, StyleDef> = {
  title:    { label: "Titre",      font: "Erode Medium Italic", size: 96, color: "#ffffff",                 align: "left", lineHeight: 1.12, mark: null, margins: m(0) },
  subtitle: { label: "Sous-titre", font: "Erode Medium Italic", size: 60, color: "#ffffff",                 align: "left", lineHeight: 1.2,  mark: null, margins: m(52) },
  text:     { label: "Texte",      font: DEFAULT_FONT,          size: 48, color: "rgba(255,255,255,.95)",   align: "left", lineHeight: 1.32, mark: null, margins: m(24) },
  bullet:   { label: "Puce",       font: DEFAULT_FONT,          size: 46, color: "rgba(255,255,255,.95)",   align: "left", lineHeight: 1.3,  mark: "•",  margins: m(14, 44) },
  arrow:    { label: "Créneau",    font: DEFAULT_FONT,          size: 52, color: "#eef4f1",                 align: "left", lineHeight: 1.24, mark: "→",  margins: m(10, 44) },
  note:     { label: "Note",       font: DEFAULT_FONT,          size: 40, color: "rgba(255,255,255,.82)",   align: "left", lineHeight: 1.36, mark: null, margins: m(40) },
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
  background?: Background | null;
  logos?: LogoPlacement[] | null;
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
  background: Background;
  slides: Slide[];
  logos: LogoPlacement[];
  timing?: Timing;
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
  background?: Background;
  slides: Slide[];
  logos?: LogoPlacement[];
  timing?: Timing;
}

export interface ResolvedDoc extends DocLike {
  styles: Record<LineStyleKey, StyleDef>;
  contentMargin: ContentMargin;
  blockPosition: BlockPosition;
  background: Background;
  logos: LogoPlacement[];
  timing: Timing;
}

export type Anchor =
  | "top-left" | "top" | "top-right"
  | "left" | "center" | "right"
  | "bottom-left" | "bottom" | "bottom-right";

export const ANCHORS: Anchor[] = [
  "top-left", "top", "top-right",
  "left", "center", "right",
  "bottom-left", "bottom", "bottom-right",
];

export interface LogoPlacement {
  id: string;
  logoRef: string;
  anchors: Anchor[];
  free?: { x: number; y: number } | null;
  size: number;
  opacity: number;
}

export function newLogoPlacement(logoRef: string): LogoPlacement {
  return { id: uid(), logoRef, anchors: ["bottom-right"], free: null, size: 0.12, opacity: 0.9 };
}

export function effectiveLogos(
  doc: { logos?: LogoPlacement[] },
  slide: Slide | null,
): LogoPlacement[] {
  if (slide && slide.logos) return slide.logos;
  return doc.logos ?? [];
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
    background: doc.background ?? defaultBackground(),
    logos: doc.logos ?? [],
    timing: doc.timing ?? defaultTiming(),
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
    background: defaultBackground(),
    slides: [newSlide()],
    logos: [],
    timing: defaultTiming(),
  };
}

export function newStoryPayload(title = "Nouvelle story"): StoryPayload {
  return baseNew("story", "9:16", title);
}

export function newPostPayload(format: Format = "1:1", title = "Nouveau post"): StoryPayload {
  return { ...baseNew("post", format, title), postMode: "single" };
}

export function effectiveBackground(
  doc: { background: Background },
  slide: Slide | null,
): Background {
  return (slide && slide.background) ? slide.background : doc.background;
}
