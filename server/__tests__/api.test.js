// server/__tests__/api.test.js
import { describe, it, expect, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import request from "supertest";
import { makePaths, ensureDataDirs } from "../paths.js";
import { createStore } from "../store.js";
import { createApp } from "../app.js";

const tmp = join(process.cwd(), ".tmp-test-api");
afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

async function freshApp() {
  const p = makePaths(tmp);
  await ensureDataDirs(p);
  return createApp({ store: createStore(p), paths: p, serveStatic: false });
}

describe("API", () => {
  it("GET /api/library renvoie une liste vide au départ", async () => {
    const app = await freshApp();
    const res = await request(app).get("/api/library");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /api/doc crée puis GET /api/doc/:id relit", async () => {
    const app = await freshApp();
    const create = await request(app).post("/api/doc").send({ type: "story", title: "Hello", slides: [] });
    expect(create.status).toBe(201);
    const id = create.body.id;
    const get = await request(app).get(`/api/doc/${id}`);
    expect(get.status).toBe(200);
    expect(get.body.title).toBe("Hello");
  });

  it("PUT met à jour, DELETE supprime", async () => {
    const app = await freshApp();
    const { body } = await request(app).post("/api/doc").send({ type: "story", title: "A", slides: [] });
    await request(app).put(`/api/doc/${body.id}`).send({ ...body, title: "B" }).expect(200);
    await request(app).get(`/api/doc/${body.id}`).expect(200).then((r) => expect(r.body.title).toBe("B"));
    await request(app).delete(`/api/doc/${body.id}`).expect(200);
    await request(app).get(`/api/doc/${body.id}`).expect(404);
  });

  it("une route /api inconnue renvoie un 404 JSON", async () => {
    const app = await freshApp();
    const res = await request(app).get("/api/inconnu");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not found" });
  });

  it("PATCH met à jour partiellement (titre + statut) sans toucher au type", async () => {
    const app = await freshApp();
    const { body } = await request(app).post("/api/doc").send({ type: "story", title: "A", slides: [] });
    const res = await request(app).patch(`/api/doc/${body.id}`).send({ title: "B", status: "ready" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("B");
    expect(res.body.status).toBe("ready");
    expect(res.body.type).toBe("story");
  });

  it("PATCH sur un id inconnu renvoie 404", async () => {
    const app = await freshApp();
    await request(app).patch("/api/doc/inconnu").send({ title: "X" }).expect(404);
  });
});
