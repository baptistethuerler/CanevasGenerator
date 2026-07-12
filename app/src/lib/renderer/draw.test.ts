import { describe, it, expect } from "vitest";
import { drawSlide, STORY_DIMS, dimsFor, DIMS, drawBackground, hexToRgba, computeImageRect } from "./draw";
import { DEFAULT_STYLES, defaultContentMargin, defaultBackground } from "../model";

function fakeCtx() {
  const calls: any[][] = [];
  return {
    font: "", fillStyle: "", textBaseline: "", textAlign: "",
    clearRect: (...a: any[]) => calls.push(["clearRect", ...a]),
    fillRect: (...a: any[]) => calls.push(["fillRect", ...a]),
    fillText: (...a: any[]) => calls.push(["fillText", ...a]),
    measureText: (t: string) => ({ width: String(t).length * 20 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    drawImage: (...a: any[]) => calls.push(["drawImage", ...a]),
    filter: "none",
    save: () => {},
    restore: () => {},
    calls,
  };
}

const opts = { dims: STORY_DIMS, background: defaultBackground(), contentMargin: defaultContentMargin(), blockPosition: "center" as const };

describe("drawSlide", () => {
  it("peint le fond puis le texte", () => {
    const ctx = fakeCtx();
    const slide = { id: "s", lines: [{ id: "1", style: "title" as const, text: "Bonjour" }] };
    drawSlide(ctx as any, slide, DEFAULT_STYLES, opts);
    const kinds = ctx.calls.map((c) => c[0]);
    expect(kinds).toContain("fillRect");
    expect(ctx.calls.some((c) => c[0] === "fillText" && c[1] === "Bonjour")).toBe(true);
  });

  it("centre le bloc plus bas que lorsqu'il est en haut", () => {
    const slide = { id: "s", lines: [{ id: "1", style: "title" as const, text: "Hi" }] };
    const yOf = (blockPosition: "top" | "center" | "bottom") => {
      const ctx = fakeCtx();
      drawSlide(ctx as any, slide, DEFAULT_STYLES, { ...opts, blockPosition });
      const t = ctx.calls.find((c) => c[0] === "fillText" && c[1] === "Hi");
      return t ? t[3] : 0;
    };
    expect(yOf("center")).toBeGreaterThan(yOf("top"));
    expect(yOf("bottom")).toBeGreaterThan(yOf("center"));
  });

  it("STORY_DIMS = 1080x1920, marge 50", () => {
    expect(STORY_DIMS).toEqual({ width: 1080, height: 1920, margin: 50 });
  });

  it("une marge de contenu gauche plus grande décale le texte vers la droite", () => {
    const slide = { id: "s", lines: [{ id: "1", style: "text" as const, text: "Hi" }] };
    const xOf = (left: number) => {
      const ctx = fakeCtx();
      drawSlide(ctx as any, slide, DEFAULT_STYLES, { ...opts, contentMargin: { linked: false, top: 50, right: 50, bottom: 50, left } });
      const t = ctx.calls.find((c) => c[0] === "fillText" && c[1] === "Hi");
      return t ? t[2] : 0; // x de la ligne
    };
    expect(xOf(50)).toBe(50);
    expect(xOf(200)).toBe(200);
  });

  it("centre le texte quand le style est aligné au centre", () => {
    const styles = { ...DEFAULT_STYLES, text: { ...DEFAULT_STYLES.text, align: "center" as const } };
    const slide = { id: "s", lines: [{ id: "1", style: "text" as const, text: "Hi" }] };
    const ctx = fakeCtx();
    // measureText factice : "Hi" = 2 * 20 = 40 px de large.
    drawSlide(ctx as any, slide, styles, opts);
    const t = ctx.calls.find((c) => c[0] === "fillText" && c[1] === "Hi");
    // areaLeft = 50, areaRight = 1080 - 50 = 1030 ; centre = (50+1030)/2 - 40/2 = 520.
    expect(t?.[2]).toBe(520);
  });
});

describe("dimsFor", () => {
  it("donne les bonnes dimensions par format", () => {
    expect(dimsFor("1:1")).toEqual({ width: 1080, height: 1080, margin: 50 });
    expect(dimsFor("4:5")).toEqual({ width: 1080, height: 1350, margin: 50 });
  });
  it("retombe sur 9:16 pour un format inconnu", () => {
    expect(dimsFor("bidon")).toEqual(DIMS["9:16"]);
  });
});

describe("hexToRgba", () => {
  it("convertit un hex + alpha", () => {
    expect(hexToRgba("#000000", 0.5)).toBe("rgba(0, 0, 0, 0.5)");
    expect(hexToRgba("#ffffff", 1)).toBe("rgba(255, 255, 255, 1)");
  });
});

describe("drawBackground", () => {
  const dims = { width: 1080, height: 1920, margin: 50 };

  it("peint la couleur (fillRect) sans voile quand overlay=none", () => {
    const ctx = fakeCtx();
    drawBackground(ctx as any, { kind: "color", color: "#4e7a63", overlay: { type: "none", color: "#000", intensity: 0.5, direction: "bottom", softness: 0.5 } }, dims);
    const fills = ctx.calls.filter((c) => c[0] === "fillRect");
    expect(fills).toHaveLength(1);
  });

  it("ajoute un fillRect pour un voile uniforme", () => {
    const ctx = fakeCtx();
    drawBackground(ctx as any, { kind: "color", color: "#4e7a63", overlay: { type: "uniform", color: "#000", intensity: 0.5, direction: "bottom", softness: 0.5 } }, dims);
    expect(ctx.calls.filter((c) => c[0] === "fillRect")).toHaveLength(2);
  });

  it("crée un dégradé linéaire pour un voile dégradé", () => {
    const ctx = fakeCtx();
    let linear = 0;
    (ctx as any).createLinearGradient = () => { linear++; return { addColorStop: () => {} }; };
    drawBackground(ctx as any, { kind: "color", color: "#4e7a63", overlay: { type: "gradient", color: "#000", intensity: 0.6, direction: "bottom", softness: 0.5 } }, dims);
    expect(linear).toBe(1);
    expect(ctx.calls.filter((c) => c[0] === "fillRect")).toHaveLength(2);
  });

  it("crée un dégradé radial pour la direction radiale", () => {
    const ctx = fakeCtx();
    let radial = 0;
    (ctx as any).createRadialGradient = () => { radial++; return { addColorStop: () => {} }; };
    drawBackground(ctx as any, { kind: "color", color: "#4e7a63", overlay: { type: "gradient", color: "#000", intensity: 0.6, direction: "radial", softness: 0.5 } }, dims);
    expect(radial).toBe(1);
    expect(ctx.calls.filter((c) => c[0] === "fillRect")).toHaveLength(2);
  });

  it("ne peint pas de voile si l'intensité est nulle", () => {
    const ctx = fakeCtx();
    drawBackground(ctx as any, { kind: "color", color: "#4e7a63", overlay: { type: "gradient", color: "#000", intensity: 0, direction: "bottom", softness: 0.5 } }, dims);
    expect(ctx.calls.filter((c) => c[0] === "fillRect")).toHaveLength(1);
  });
});

describe("computeImageRect (cover + zoom + focal)", () => {
  it("couvre entièrement le canvas", () => {
    const r = computeImageRect(1080, 1920, 1080, 1080, { zoom: 1, x: 0.5, y: 0.5 });
    expect(r.dw).toBeGreaterThanOrEqual(1080);
    expect(r.dh).toBeGreaterThanOrEqual(1920);
  });
  it("centre l'image quand le point focal est au milieu", () => {
    const r = computeImageRect(1080, 1920, 1080, 1080, { zoom: 1, x: 0.5, y: 0.5 });
    expect(r.dx).toBeCloseTo((1080 - r.dw) / 2, 5);
  });
});

describe("drawBackground image", () => {
  const dims = { width: 1080, height: 1920, margin: 50 };
  const img = { width: 1080, height: 1080 };

  it("dessine l'image quand kind=image et image fournie (pas de fillRect de couleur)", () => {
    const ctx = fakeCtx();
    const bg = { kind: "image" as const, color: "#4e7a63", imageRef: "a.png", overlay: { type: "none" as const, color: "#000", intensity: 0.5, direction: "bottom" as const, softness: 0.5 } };
    drawBackground(ctx as any, bg, dims, img as any);
    expect(ctx.calls.some((c) => c[0] === "drawImage")).toBe(true);
    expect(ctx.calls.filter((c) => c[0] === "fillRect")).toHaveLength(0);
  });

  it("retombe sur la couleur si l'image n'est pas encore chargée", () => {
    const ctx = fakeCtx();
    const bg = { kind: "image" as const, color: "#4e7a63", imageRef: "a.png", overlay: { type: "none" as const, color: "#000", intensity: 0.5, direction: "bottom" as const, softness: 0.5 } };
    drawBackground(ctx as any, bg, dims, undefined);
    expect(ctx.calls.some((c) => c[0] === "drawImage")).toBe(false);
    expect(ctx.calls.filter((c) => c[0] === "fillRect")).toHaveLength(1);
  });

  it("applique un filtre brightness/blur au moment du dessin de l'image", () => {
    const ctx = fakeCtx();
    let filterAtDraw = "";
    (ctx as any).drawImage = () => { filterAtDraw = (ctx as any).filter; };
    const bg = { kind: "image" as const, color: "#4e7a63", imageRef: "a.png", filters: { brightness: 1.2, blur: 3 }, overlay: { type: "none" as const, color: "#000", intensity: 0.5, direction: "bottom" as const, softness: 0.5 } };
    drawBackground(ctx as any, bg, dims, img as any);
    expect(filterAtDraw).toBe("brightness(1.2) blur(3px)");
  });
});
