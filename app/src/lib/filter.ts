import type { DocMeta } from "./api";

export interface FilterState {
  search: string;
  type: "" | "story" | "post";
  status: "" | "draft" | "ready";
  month: string; // "" ou "YYYY-MM"
  sort: "date" | "title";
}

export const EMPTY_FILTER: FilterState = { search: "", type: "", status: "", month: "", sort: "date" };

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const name = MONTHS[Number(m) - 1] ?? m;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

export function availableMonths(docs: DocMeta[]): string[] {
  const set = new Set<string>();
  for (const d of docs) if (d.date) set.add(d.date.slice(0, 7));
  return [...set].sort().reverse();
}

export function applyFilters(docs: DocMeta[], f: FilterState): DocMeta[] {
  const q = f.search.trim().toLowerCase();
  const filtered = docs.filter((d) => {
    if (q && !d.title.toLowerCase().includes(q)) return false;
    if (f.type && d.type !== f.type) return false;
    if (f.status && d.status !== f.status) return false;
    if (f.month && (d.date ?? "").slice(0, 7) !== f.month) return false;
    return true;
  });
  return [...filtered].sort((a, b) => {
    if (f.sort === "title") return a.title.localeCompare(b.title, "fr");
    return (b.date ?? "").localeCompare(a.date ?? "") || b.updatedAt.localeCompare(a.updatedAt);
  });
}
