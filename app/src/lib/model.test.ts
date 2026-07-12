import { describe, it, expect } from "vitest";
import { DEFAULT_STYLES, newLine, newSlide, newStoryPayload, STYLE_KEYS } from "./model";

describe("model", () => {
  it("expose les 6 styles par défaut avec une taille et une couleur", () => {
    expect(STYLE_KEYS).toEqual(["title", "subtitle", "text", "bullet", "arrow", "note"]);
    for (const k of STYLE_KEYS) {
      expect(DEFAULT_STYLES[k].size).toBeGreaterThan(0);
      expect(typeof DEFAULT_STYLES[k].color).toBe("string");
    }
  });

  it("newLine crée une ligne avec id, style et texte vide", () => {
    const l = newLine("subtitle");
    expect(l.id).toBeTruthy();
    expect(l.style).toBe("subtitle");
    expect(l.text).toBe("");
  });

  it("newSlide crée un slide avec au moins une ligne", () => {
    const s = newSlide();
    expect(s.id).toBeTruthy();
    expect(s.lines.length).toBeGreaterThan(0);
  });

  it("newStoryPayload produit une story format 9:16 avec un slide", () => {
    const p = newStoryPayload("Ma story");
    expect(p.type).toBe("story");
    expect(p.format).toBe("9:16");
    expect(p.title).toBe("Ma story");
    expect(p.status).toBe("draft");
    expect(p.slides).toHaveLength(1);
    expect(typeof p.date).toBe("string");
  });
});
