// server/store.js
import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const dirFor = (p, type) => (type === "post" ? p.posts : p.stories);

export function createStore(p) {
  async function readAll() {
    const out = [];
    for (const [type, dir] of [["story", p.stories], ["post", p.posts]]) {
      let files = [];
      try { files = await readdir(dir); } catch { files = []; }
      for (const f of files) {
        if (!f.endsWith(".json")) continue;
        try {
          const doc = JSON.parse(await readFile(join(dir, f), "utf8"));
          out.push(doc);
        } catch { /* fichier corrompu : ignoré du listing */ }
      }
    }
    return out;
  }

  async function findFile(id) {
    const all = await readAll();
    const doc = all.find((d) => d.id === id);
    if (!doc) throw new Error(`Document introuvable : ${id}`);
    return { doc, path: join(dirFor(p, doc.type), `${id}.json`) };
  }

  return {
    async create(input) {
      const now = new Date().toISOString();
      const doc = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        status: "draft",
        ...input,
      };
      await writeFile(join(dirFor(p, doc.type), `${doc.id}.json`), JSON.stringify(doc, null, 2));
      return doc;
    },
    async get(id) {
      const { doc } = await findFile(id);
      return doc;
    },
    async list() {
      const all = await readAll();
      // Métadonnées seulement (on retire slides pour alléger le listing)
      return all.map(({ slides, ...meta }) => ({ ...meta, slideCount: Array.isArray(slides) ? slides.length : 0 }));
    },
    async update(id, next) {
      const { path } = await findFile(id);
      const doc = { ...next, id, updatedAt: new Date().toISOString() };
      await writeFile(path, JSON.stringify(doc, null, 2));
      return doc;
    },
    async remove(id) {
      const { path } = await findFile(id);
      await unlink(path);
    },
  };
}
