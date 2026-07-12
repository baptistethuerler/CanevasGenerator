import { Router } from "express";

export function assetsRouter(assets) {
  const r = Router();

  r.get("/assets/images", async (_req, res) => {
    try { res.json(await assets.list()); }
    catch { res.status(500).json({ error: "list failed" }); }
  });

  r.post("/assets/images", async (req, res) => {
    try { res.status(201).json(await assets.save(req.body?.dataUrl)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  r.delete("/assets/images/:ref", async (req, res) => {
    try { await assets.remove(req.params.ref); res.json({ ok: true }); }
    catch { res.status(404).json({ error: "not found" }); }
  });

  return r;
}
