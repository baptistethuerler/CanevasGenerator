import { Router } from "express";

export function assetsRouter(assets, resource) {
  const r = Router();

  r.get(`/assets/${resource}`, async (_req, res) => {
    try { res.json(await assets.list()); }
    catch { res.status(500).json({ error: "list failed" }); }
  });

  r.post(`/assets/${resource}`, async (req, res) => {
    try { res.status(201).json(await assets.save(req.body?.dataUrl)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  r.delete(`/assets/${resource}/:ref`, async (req, res) => {
    try { await assets.remove(req.params.ref); res.json({ ok: true }); }
    catch { res.status(404).json({ error: "not found" }); }
  });

  return r;
}
