// server/routes/docs.js
import { Router } from "express";

export function docsRouter(store) {
  const r = Router();

  r.post("/doc", async (req, res) => {
    const doc = await store.create(req.body);
    res.status(201).json(doc);
  });

  r.get("/doc/:id", async (req, res) => {
    try {
      res.json(await store.get(req.params.id));
    } catch {
      res.status(404).json({ error: "not found" });
    }
  });

  r.put("/doc/:id", async (req, res) => {
    try {
      res.json(await store.update(req.params.id, req.body));
    } catch {
      res.status(404).json({ error: "not found" });
    }
  });

  r.delete("/doc/:id", async (req, res) => {
    try {
      await store.remove(req.params.id);
      res.json({ ok: true });
    } catch {
      res.status(404).json({ error: "not found" });
    }
  });

  return r;
}
