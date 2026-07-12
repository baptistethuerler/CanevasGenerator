// server/__tests__/store.test.js
import { describe, it, expect, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { makePaths, ensureDataDirs } from "../paths.js";
import { createStore } from "../store.js";

const tmp = join(process.cwd(), ".tmp-test-store");

afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

async function freshStore() {
  const p = makePaths(tmp);
  await ensureDataDirs(p);
  return createStore(p);
}

describe("store", () => {
  it("crée un document avec un id et le relit", async () => {
    const store = await freshStore();
    const doc = await store.create({ type: "story", title: "Test", slides: [] });
    expect(doc.id).toBeTruthy();
    const read = await store.get(doc.id);
    expect(read.title).toBe("Test");
    expect(read.type).toBe("story");
  });

  it("liste les documents (métadonnées)", async () => {
    const store = await freshStore();
    await store.create({ type: "story", title: "A", slides: [] });
    await store.create({ type: "post", title: "B", slides: [] });
    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(list.map((d) => d.title).sort()).toEqual(["A", "B"]);
  });

  it("met à jour et supprime", async () => {
    const store = await freshStore();
    const doc = await store.create({ type: "story", title: "X", slides: [] });
    await store.update(doc.id, { ...doc, title: "Y" });
    expect((await store.get(doc.id)).title).toBe("Y");
    await store.remove(doc.id);
    await expect(store.get(doc.id)).rejects.toThrow();
  });
});
