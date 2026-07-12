import { describe, it, expect } from "vitest";
import { drawSlide, STORY_DIMS, dimsFor, DIMS } from "./draw";
import { DEFAULT_STYLES, defaultContentMargin } from "../model";

function fakeCtx() {
  const calls: any[][] = [];
  return {
    font: "", fillStyle: "", textBaseline: "", textAlign: "",
    clearRect: (...a: any[]) => calls.push(["clearRect", ...a]),
    fillRect: (...a: any[]) => calls.push(["fillRect", ...a]),
    fillText: (...a: any[]) => calls.push(["fillText", ...a]),
    measureText: (t: string) => ({ width: String(t).length * 20 }),
    calls,
  };
}

const opts = { dims: STORY_DIMS, background: "#4e7a63", contentMargin: defaultContentMargin(), blockPosition: "center" as const };

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
