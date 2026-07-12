import type { Slide, StoryPayload, Format, LineStyleKey, StyleDef, ContentMargin, BlockPosition, Background } from "./model";
import { ensureDocDefaults } from "./model";

export type DocMeta = {
  id: string;
  type: "story" | "post";
  title: string;
  status: "draft" | "ready";
  date?: string;
  updatedAt: string;
  slideCount: number;
};

export async function fetchLibrary(): Promise<DocMeta[]> {
  const res = await fetch("/api/library");
  if (!res.ok) throw new Error("Échec du chargement de la bibliothèque");
  return res.json();
}

export interface StoryDoc {
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
}

export async function createDoc(payload: StoryPayload): Promise<StoryDoc> {
  const res = await fetch("/api/doc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Création impossible");
  return res.json();
}

export async function getDoc(id: string): Promise<StoryDoc> {
  const res = await fetch(`/api/doc/${id}`);
  if (!res.ok) throw new Error("Document introuvable");
  return res.json();
}

export async function updateDoc(id: string, doc: StoryDoc): Promise<StoryDoc> {
  const res = await fetch(`/api/doc/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error("Enregistrement impossible");
  return res.json();
}

export async function patchDoc(id: string, partial: Partial<StoryDoc>): Promise<StoryDoc> {
  const res = await fetch(`/api/doc/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  if (!res.ok) throw new Error("Mise à jour impossible");
  return res.json();
}

export async function deleteDoc(id: string): Promise<void> {
  const res = await fetch(`/api/doc/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Suppression impossible");
}

export async function duplicateDoc(id: string): Promise<StoryDoc> {
  const src = ensureDocDefaults(await getDoc(id));
  const payload: StoryPayload = {
    type: src.type,
    format: src.format as Format,
    postMode: src.type === "post" ? "single" : undefined,
    title: `${src.title} (copie)`,
    status: "draft",
    date: src.date ?? new Date().toISOString().slice(0, 10),
    styles: src.styles,
    contentMargin: src.contentMargin,
    blockPosition: src.blockPosition,
    background: src.background,
    slides: src.slides,
  };
  return createDoc(payload);
}

export interface ImageAsset {
  ref: string;
  url: string;
}

export async function listImages(): Promise<ImageAsset[]> {
  const res = await fetch("/api/assets/images");
  if (!res.ok) throw new Error("Chargement des images impossible");
  return res.json();
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Lecture du fichier impossible"));
    r.readAsDataURL(file);
  });
}

export async function uploadImage(file: File): Promise<ImageAsset> {
  const dataUrl = await fileToDataUrl(file);
  const res = await fetch("/api/assets/images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) throw new Error("Upload de l'image impossible");
  return res.json();
}

export async function deleteImage(ref: string): Promise<void> {
  const res = await fetch(`/api/assets/images/${ref}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Suppression de l'image impossible");
}
