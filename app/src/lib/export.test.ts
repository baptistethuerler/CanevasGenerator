import { describe, it, expect } from "vitest";
import { slug } from "./export";

describe("slug", () => {
  it("normalise un titre en nom de fichier", () => {
    expect(slug("Dispos juillet")).toBe("dispos-juillet");
    expect(slug("Été 2026 !")).toBe("ete-2026");
    expect(slug("  ")).toBe("export");
    expect(slug("")).toBe("export");
  });
});
