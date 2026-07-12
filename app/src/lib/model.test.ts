import { describe, it, expect } from "vitest";
import { DEFAULT_STYLES, newLine, newSlide, newStoryPayload, newPostPayload, STYLE_KEYS, mergeStyle, ensureDocDefaults, defaultContentMargin, defaultBackground, effectiveBackground, defaultCrop, defaultFilters } from "./model";

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

  it("newPostPayload produit un post au format demandé", () => {
    const p = newPostPayload("1:1");
    expect(p.type).toBe("post");
    expect(p.format).toBe("1:1");
    expect(p.postMode).toBe("single");
    expect(p.slides).toHaveLength(1);
  });

  it("newPostPayload accepte le format portrait", () => {
    expect(newPostPayload("4:5").format).toBe("4:5");
  });
});

describe("styles & mise en page", () => {
  it("chaque style par défaut a un alignement et 4 marges", () => {
    for (const k of STYLE_KEYS) {
      expect(DEFAULT_STYLES[k].align).toBe("left");
      const m = DEFAULT_STYLES[k].margins;
      expect(typeof m.top).toBe("number");
      expect(typeof m.right).toBe("number");
      expect(typeof m.bottom).toBe("number");
      expect(typeof m.left).toBe("number");
    }
  });

  it("mergeStyle applique une surcharge partielle (dont marges)", () => {
    const base = DEFAULT_STYLES.text;
    const merged = mergeStyle(base, { size: 100, margins: { ...base.margins, left: 80 } });
    expect(merged.size).toBe(100);
    expect(merged.margins.left).toBe(80);
    expect(merged.color).toBe(base.color);
  });

  it("mergeStyle sans surcharge renvoie le style de base", () => {
    expect(mergeStyle(DEFAULT_STYLES.title, undefined)).toEqual(DEFAULT_STYLES.title);
  });

  it("newStoryPayload embarque styles, contentMargin (50) et blockPosition", () => {
    const p = newStoryPayload();
    expect(Object.keys(p.styles).sort()).toEqual([...STYLE_KEYS].sort());
    expect(p.contentMargin).toEqual({ linked: true, top: 50, right: 50, bottom: 50, left: 50 });
    expect(p.blockPosition).toBe("center");
  });

  it("ensureDocDefaults complète un doc sans réglages de mise en page", () => {
    const doc = ensureDocDefaults({
      id: "x", type: "story", format: "9:16", title: "T", status: "draft",
      createdAt: "now", updatedAt: "now", slides: [],
    });
    expect(doc.blockPosition).toBe("center");
    expect(doc.contentMargin).toEqual(defaultContentMargin());
    expect(Object.keys(doc.styles).length).toBe(STYLE_KEYS.length);
  });

  it("ensureDocDefaults préserve les réglages existants", () => {
    const cm = { linked: false, top: 10, right: 20, bottom: 30, left: 40 };
    const doc = ensureDocDefaults({
      id: "x", type: "story", format: "9:16", title: "T", status: "draft",
      createdAt: "now", updatedAt: "now", slides: [], contentMargin: cm, blockPosition: "top",
    });
    expect(doc.contentMargin).toEqual(cm);
    expect(doc.blockPosition).toBe("top");
  });
});

describe("fond & voile", () => {
  it("defaultBackground est une couleur sauge sans voile", () => {
    const bg = defaultBackground();
    expect(bg.kind).toBe("color");
    expect(bg.color).toBe("#4e7a63");
    expect(bg.overlay.type).toBe("none");
  });

  it("newStoryPayload embarque un background par défaut", () => {
    expect(newStoryPayload().background).toEqual(defaultBackground());
  });

  it("ensureDocDefaults ajoute un background si absent", () => {
    const doc = ensureDocDefaults({
      id: "x", type: "story", format: "9:16", title: "T", status: "draft",
      createdAt: "now", updatedAt: "now", slides: [],
    });
    expect(doc.background).toEqual(defaultBackground());
  });

  it("effectiveBackground : la surcharge du slide prime sur celle du document", () => {
    const docBg = defaultBackground();
    const slideBg = { ...defaultBackground(), color: "#c9836a" };
    const doc = { background: docBg } as any;
    expect(effectiveBackground(doc, { id: "s", lines: [], background: slideBg })).toBe(slideBg);
    expect(effectiveBackground(doc, { id: "s", lines: [] })).toBe(docBg);
  });
});

describe("fond image", () => {
  it("defaultCrop = zoom 1, centré", () => {
    expect(defaultCrop()).toEqual({ zoom: 1, x: 0.5, y: 0.5 });
  });
  it("defaultFilters = neutre", () => {
    expect(defaultFilters()).toEqual({ brightness: 1, blur: 0 });
  });
});
