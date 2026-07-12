// server/routes/library.js
import { Router } from "express";

export function libraryRouter(store) {
  const r = Router();
  r.get("/library", async (_req, res) => {
    try {
      res.json(await store.list());
    } catch {
      res.status(500).json({ error: "library failed" });
    }
  });
  return r;
}
