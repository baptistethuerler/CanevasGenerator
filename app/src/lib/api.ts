import type { Slide, StoryPayload } from "./model";

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
  title: string;
  status: "draft" | "ready";
  date?: string;
  createdAt: string;
  updatedAt: string;
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
