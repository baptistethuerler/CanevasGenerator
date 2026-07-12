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
