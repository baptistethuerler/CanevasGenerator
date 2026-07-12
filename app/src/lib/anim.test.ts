import { describe, it, expect } from "vitest";
import { buildStoryPhases, phasesTotalDuration, frameAt } from "./anim";

const T = { duration: 4.5, transition: 0.7 };

describe("buildStoryPhases", () => {
  it("renvoie une liste vide pour 0 slide", () => {
    expect(buildStoryPhases(0, T)).toEqual([]);
  });

  it("un seul slide : in puis hold (pas de fondu sortant)", () => {
    expect(buildStoryPhases(1, T)).toEqual([
      { kind: "in", from: 0, to: 0, duration: 0.7 },
      { kind: "hold", from: 0, to: 0, duration: 4.5 },
    ]);
  });

  it("trois slides : in, hold, (cross, hold)×2, se termine sur un hold", () => {
    const p = buildStoryPhases(3, T);
    expect(p.map((x) => x.kind)).toEqual(["in", "hold", "cross", "hold", "cross", "hold"]);
    expect(p[2]).toEqual({ kind: "cross", from: 0, to: 1, duration: 0.7 });
    expect(p[4]).toEqual({ kind: "cross", from: 1, to: 2, duration: 0.7 });
    expect(p[p.length - 1]).toEqual({ kind: "hold", from: 2, to: 2, duration: 4.5 });
  });
});

describe("phasesTotalDuration", () => {
  it("somme les durées des phases", () => {
    // 2 slides : 0.7 + 4.5 + 0.7 + 4.5 = 10.4
    expect(phasesTotalDuration(buildStoryPhases(2, T))).toBeCloseTo(10.4, 5);
  });
});

describe("frameAt", () => {
  const phases = buildStoryPhases(2, T); // in .7 | hold 4.5 | cross .7 | hold 4.5

  it("t=0 → apparition du slide 0, progression 0", () => {
    expect(frameAt(phases, 0)).toEqual({ kind: "in", from: 0, to: 0, t: 0 });
  });

  it("milieu de l'apparition → progression 0.5", () => {
    expect(frameAt(phases, 0.35)).toEqual({ kind: "in", from: 0, to: 0, t: 0.5 });
  });

  it("pendant le maintien → hold slide 0", () => {
    const f = frameAt(phases, 1.0);
    expect(f.kind).toBe("hold");
    expect(f.from).toBe(0);
  });

  it("milieu du fondu enchaîné → cross 0→1 progression 0.5", () => {
    const f = frameAt(phases, 5.2 + 0.35); // 0.7+4.5 = 5.2, +0.35 = milieu du cross
    expect(f.kind).toBe("cross");
    expect(f.from).toBe(0);
    expect(f.to).toBe(1);
    expect(f.t).toBeCloseTo(0.5, 5);
  });

  it("au-delà de la fin → dernière image figée (hold slide final, t=1)", () => {
    expect(frameAt(phases, 999)).toEqual({ kind: "hold", from: 1, to: 1, t: 1 });
  });

  it("liste vide → hold slide 0 figé", () => {
    expect(frameAt([], 0)).toEqual({ kind: "hold", from: 0, to: 0, t: 1 });
  });
});
