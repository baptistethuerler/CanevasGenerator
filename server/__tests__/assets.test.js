import { describe, it, expect, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { makePaths, ensureDataDirs } from "../paths.js";
import { createAssets } from "../assets.js";

const tmp = join(process.cwd(), ".tmp-test-assets");
afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

// PNG 1x1 transparent (base64) sous forme de data URL.
const PNG_1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function freshAssets() {
  const p = makePaths(tmp);
  await ensureDataDirs(p);
  return createAssets(p);
}

describe("assets", () => {
  it("enregistre une image base64 puis la liste", async () => {
    const a = await freshAssets();
    const saved = await a.save(PNG_1x1);
    expect(saved.ref).toMatch(/\.png$/);
    expect(saved.url).toBe(`/images/${saved.ref}`);
    const list = await a.list();
    expect(list.map((x) => x.ref)).toContain(saved.ref);
  });

  it("refuse une dataUrl invalide", async () => {
    const a = await freshAssets();
    await expect(a.save("pas-une-image")).rejects.toThrow();
  });

  it("supprime une image", async () => {
    const a = await freshAssets();
    const saved = await a.save(PNG_1x1);
    await a.remove(saved.ref);
    expect((await a.list()).map((x) => x.ref)).not.toContain(saved.ref);
  });

  it("refuse un ref contenant un chemin (anti-traversal)", async () => {
    const a = await freshAssets();
    await expect(a.remove("../secret.txt")).rejects.toThrow();
  });
});
