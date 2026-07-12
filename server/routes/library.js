// server/routes/library.js
import { Router } from "express";

export function libraryRouter(store) {
  const r = Router();
  r.get("/library", async (_req, res) => {
    res.json(await store.list());
  });
  return r;
}
