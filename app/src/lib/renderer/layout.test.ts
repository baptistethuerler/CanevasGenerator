import { describe, it, expect } from "vitest";
import { layoutSlide, wrapText, wrapRich, parseBold, fontString } from "./layout";
import { DEFAULT_STYLES } from "../model";

const measure = (t: string) => t.length * 10;

describe("wrapText", () => {
  it("coupe le texte pour tenir dans la largeur", () => {
    expect(wrapText("aaa bbb ccc", 60, measure).length).toBeGreaterThan(1);
  });
  it("renvoie une ligne vide pour un texte vide", () => {
    expect(wrapText("", 100, measure)).toEqual([""]);
  });
  it("honore un retour à la ligne manuel", () => {
    expect(wrapText("a\nb", 1000, measure)).toEqual(["a", "b"]);
  });
});

describe("parseBold", () => {
  it("découpe le gras entre **", () => {
    expect(parseBold("normal **gras** fin")).toEqual([
      { text: "normal ", bold: false },
      { text: "gras", bold: true },
      { text: " fin", bold: false },
    ]);
  });
  it("un texte sans marqueur = un seul segment normal", () => {
    expect(parseBold("bonjour")).toEqual([{ text: "bonjour", bold: false }]);
  });
});

describe("wrapRich", () => {
  const m = (t: string) => t.length * 10;
  it("honore les retours à la ligne", () => {
    expect(wrapRich("a\nb", 1000, m)).toHaveLength(2);
  });
  it("marque en gras le segment entre **", () => {
    const runs = wrapRich("x **y**", 1000, m)[0];
    expect(runs.some((r) => r.bold && r.text.includes("y"))).toBe(true);
    expect(runs.some((r) => !r.bold && r.text.includes("x"))).toBe(true);
  });
  it("texte vide → une ligne vide", () => {
    expect(wrapRich("", 100, m)).toEqual([[{ text: "", bold: false }]]);
  });
});

describe("fontString", () => {
  it("compose taille + police", () => {
    expect(fontString(DEFAULT_STYLES.title)).toContain("96px");
    expect(fontString(DEFAULT_STYLES.title)).toContain("Erode Medium Italic");
  });
});

describe("layoutSlide", () => {
  it("produit un bloc par ligne, sans écart avant la 1re", () => {
    const lines = [
      { id: "1", style: "title" as const, text: "Titre" },
      { id: "2", style: "text" as const, text: "Un texte" },
    ];
    const layout = layoutSlide(lines, DEFAULT_STYLES, { contentWidth: 980, measure: (t) => t.length * 10 });
    expect(layout.blocks).toHaveLength(2);
    expect(layout.blocks[0].gapBefore).toBe(0);
    expect(layout.blocks[1].gapBefore).toBe(DEFAULT_STYLES.text.margins.top);
    expect(layout.totalHeight).toBeGreaterThan(0);
  });

  it("applique la surcharge de ligne (override)", () => {
    const lines = [
      { id: "1", style: "text" as const, text: "X", override: { size: 100 } },
    ];
    const layout = layoutSlide(lines, DEFAULT_STYLES, { contentWidth: 980, measure: (t) => t.length * 10 });
    expect(layout.blocks[0].style.size).toBe(100);
  });
});
