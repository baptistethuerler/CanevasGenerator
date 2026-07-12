import { describe, it, expect, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { makePaths, ensureDataDirs } from "../paths.js";
import { createAssets } from "../assets.js";
import request from "supertest";
import { createStore } from "../store.js";
import { createApp } from "../app.js";

const tmp = join(process.cwd(), ".tmp-test-assets");
afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

// PNG 1x1 transparent (base64) sous forme de data URL.
const PNG_1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function freshAssets() {
  const p = makePaths(tmp);
  await ensureDataDirs(p);
  return createAssets(p.images, "/images");
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

async function freshApp() {
  const p = makePaths(tmp);
  await ensureDataDirs(p);
  return createApp({ store: createStore(p), paths: p, serveStatic: false });
}

describe("API assets", () => {
  it("POST puis GET liste l'image ; DELETE la retire", async () => {
    const app = await freshApp();
    const post = await request(app).post("/api/assets/images").send({ dataUrl: PNG_1x1 });
    expect(post.status).toBe(201);
    expect(post.body.ref).toMatch(/\.png$/);
    const list = await request(app).get("/api/assets/images");
    expect(list.body.map((x) => x.ref)).toContain(post.body.ref);
    await request(app).delete(`/api/assets/images/${post.body.ref}`).expect(200);
    const after = await request(app).get("/api/assets/images");
    expect(after.body.map((x) => x.ref)).not.toContain(post.body.ref);
  });

  it("POST d'une dataUrl invalide renvoie 400", async () => {
    const app = await freshApp();
    await request(app).post("/api/assets/images").send({ dataUrl: "nope" }).expect(400);
  });
});

describe("API assets — logos", () => {
  it("POST puis GET liste le logo ; DELETE le retire", async () => {
    const app = await freshApp();
    const post = await request(app).post("/api/assets/logos").send({ dataUrl: PNG_1x1 });
    expect(post.status).toBe(201);
    expect(post.body.url).toBe(`/logos/${post.body.ref}`);
    const list = await request(app).get("/api/assets/logos");
    expect(list.body.map((x) => x.ref)).toContain(post.body.ref);
    await request(app).delete(`/api/assets/logos/${post.body.ref}`).expect(200);
  });
});
