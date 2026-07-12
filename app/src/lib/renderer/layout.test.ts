import { describe, it, expect } from "vitest";
import { layoutSlide, wrapText, fontString } from "./layout";
import { DEFAULT_STYLES } from "../model";

const measure = (t: string) => t.length * 10;

describe("wrapText", () => {
  it("coupe le texte pour tenir dans la largeur", () => {
    expect(wrapText("aaa bbb ccc", 60, measure).length).toBeGreaterThan(1);
  });
  it("renvoie une ligne vide pour un texte vide", () => {
    expect(wrapText("", 100, measure)).toEqual([""]);
  });
});

describe("fontString", () => {
  it("compose taille + police", () => {
    expect(fontString(DEFAULT_STYLES.title)).toContain("78px");
    expect(fontString(DEFAULT_STYLES.title)).toContain("Nunito");
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
