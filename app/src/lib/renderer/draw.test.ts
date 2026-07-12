import { describe, it, expect } from "vitest";
import { drawSlide, STORY_DIMS } from "./draw";
import { DEFAULT_STYLES } from "../model";

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

describe("drawSlide", () => {
  it("peint le fond puis le texte", () => {
    const ctx = fakeCtx();
    const slide = { id: "s", lines: [{ id: "1", style: "title" as const, text: "Bonjour" }] };
    drawSlide(ctx as any, slide, DEFAULT_STYLES, { dims: STORY_DIMS, background: "#4e7a63" });
    const kinds = ctx.calls.map((c) => c[0]);
    expect(kinds).toContain("fillRect");
    expect(kinds).toContain("fillText");
    expect(ctx.calls.some((c) => c[0] === "fillText" && c[1] === "Bonjour")).toBe(true);
  });

  it("STORY_DIMS = 1080x1920, marge 50", () => {
    expect(STORY_DIMS.width).toBe(1080);
    expect(STORY_DIMS.height).toBe(1920);
    expect(STORY_DIMS.margin).toBe(50);
  });
});
