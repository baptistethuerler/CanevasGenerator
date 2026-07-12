import { describe, it, expect } from "vitest";
import { applyFilters, availableMonths, monthLabel, EMPTY_FILTER } from "./filter";
import type { DocMeta } from "./api";

const docs: DocMeta[] = [
  { id: "1", type: "story", title: "Dispos juillet", status: "ready", date: "2026-07-11", updatedAt: "2026-07-11T10:00:00Z", slideCount: 3 },
  { id: "2", type: "post", title: "Bienfaits", status: "draft", date: "2026-06-02", updatedAt: "2026-06-02T10:00:00Z", slideCount: 1 },
  { id: "3", type: "story", title: "Réserver", status: "draft", date: "2026-07-01", updatedAt: "2026-07-01T10:00:00Z", slideCount: 4 },
];

describe("applyFilters", () => {
  it("filtre par recherche (insensible à la casse)", () => {
    expect(applyFilters(docs, { ...EMPTY_FILTER, search: "dispo" }).map((d) => d.id)).toEqual(["1"]);
  });
  it("filtre par type et statut", () => {
    expect(applyFilters(docs, { ...EMPTY_FILTER, type: "story" }).map((d) => d.id).sort()).toEqual(["1", "3"]);
    expect(applyFilters(docs, { ...EMPTY_FILTER, status: "draft" }).map((d) => d.id).sort()).toEqual(["2", "3"]);
  });
  it("filtre par mois", () => {
    expect(applyFilters(docs, { ...EMPTY_FILTER, month: "2026-07" }).map((d) => d.id).sort()).toEqual(["1", "3"]);
  });
  it("trie par date décroissante par défaut", () => {
    expect(applyFilters(docs, EMPTY_FILTER).map((d) => d.id)).toEqual(["1", "3", "2"]);
  });
  it("trie par titre A→Z", () => {
    expect(applyFilters(docs, { ...EMPTY_FILTER, sort: "title" }).map((d) => d.title)).toEqual(["Bienfaits", "Dispos juillet", "Réserver"]);
  });
});

describe("availableMonths / monthLabel", () => {
  it("liste les mois présents, du plus récent au plus ancien", () => {
    expect(availableMonths(docs)).toEqual(["2026-07", "2026-06"]);
  });
  it("libelle un mois en français", () => {
    expect(monthLabel("2026-07")).toBe("Juillet 2026");
  });
});
