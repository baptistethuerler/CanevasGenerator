// server/__tests__/paths.test.js
import { describe, it, expect, afterEach } from "vitest";
import { rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { makePaths, ensureDataDirs } from "../paths.js";

const tmp = join(process.cwd(), ".tmp-test-data");

afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

describe("paths", () => {
  it("expose les sous-dossiers attendus", () => {
    const p = makePaths(tmp);
    expect(p.stories).toBe(join(tmp, "data", "stories"));
    expect(p.posts).toBe(join(tmp, "data", "posts"));
    expect(p.images).toBe(join(tmp, "images"));
    expect(p.logos).toBe(join(tmp, "logos"));
    expect(p.fonts).toBe(join(tmp, "fonts"));
    expect(p.exports).toBe(join(tmp, "exports"));
  });

  it("crée tous les dossiers de données", async () => {
    const p = makePaths(tmp);
    await ensureDataDirs(p);
    for (const dir of [p.stories, p.posts, p.templates, p.images, p.logos, p.fonts, p.exports]) {
      const s = await stat(dir);
      expect(s.isDirectory()).toBe(true);
    }
  });
});
