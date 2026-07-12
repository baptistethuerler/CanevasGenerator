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

  it("patch préserve id/type/createdAt et régénère updatedAt", async () => {
    const store = await freshStore();
    const doc = await store.create({ type: "story", title: "X", slides: [] });
    // Un PATCH tentant de changer le type ne doit PAS déplacer le fichier ni changer le type.
    const patched = await store.patch(doc.id, { title: "Z", status: "ready", type: "post" });
    expect(patched.id).toBe(doc.id);
    expect(patched.type).toBe("story");
    expect(patched.createdAt).toBe(doc.createdAt);
    expect(patched.title).toBe("Z");
    expect(patched.status).toBe("ready");
    // Toujours relisible (donc resté dans data/stories/) avec le type d'origine.
    expect((await store.get(doc.id)).type).toBe("story");
  });
});
