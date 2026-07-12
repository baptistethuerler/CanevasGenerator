import { describe, it, expect } from "vitest";
import { layoutSlide, wrapText, fontString } from "./layout";
import { DEFAULT_STYLES } from "../model";

const measure = (t: string) => t.length * 10; // mesure factice : 10px / caractère

describe("wrapText", () => {
  it("coupe le texte pour tenir dans la largeur", () => {
    const lines = wrapText("aaa bbb ccc", 60, measure); // 60px = 6 caractères
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toBe("aaa");
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
  it("produit un bloc par ligne avec une hauteur > 0", () => {
    const lines = [
      { id: "1", style: "title" as const, text: "Titre" },
      { id: "2", style: "text" as const, text: "Un texte" },
    ];
    const layout = layoutSlide(lines, DEFAULT_STYLES, { contentWidth: 980, measure: (t) => t.length * 10 });
    expect(layout.blocks).toHaveLength(2);
    expect(layout.totalHeight).toBeGreaterThan(0);
    expect(layout.blocks[0].gap).toBe(0);
    expect(layout.blocks[1].gap).toBeGreaterThan(0);
  });
});
