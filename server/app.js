// server/app.js
import express from "express";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { libraryRouter } from "./routes/library.js";
import { docsRouter } from "./routes/docs.js";
import { assetsRouter } from "./routes/assets.js";
import { createAssets } from "./assets.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp({ store, paths, serveStatic = true }) {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use("/images", express.static(paths.images));
  app.use("/logos", express.static(paths.logos));

  app.use("/api", libraryRouter(store));
  app.use("/api", docsRouter(store));
  app.use("/api", assetsRouter(createAssets(paths.images, "/images", paths.fonds), "images"));
  app.use("/api", assetsRouter(createAssets(paths.logos, "/logos"), "logos"));
  // Version de l'interface (mtime du build) : l'app recharge la page quand elle change.
  app.get("/api/version", (_req, res) => {
    let v = "dev";
    try { v = String(statSync(join(__dirname, "..", "app", "dist", "index.html")).mtimeMs); } catch { /* pas de build (dev) */ }
    res.json({ v });
  });
  // 404 JSON pour toute route /api inconnue (cohérent avec les 404 des handlers)
  app.use("/api", (_req, res) => res.status(404).json({ error: "not found" }));

  if (serveStatic) {
    const dist = join(__dirname, "..", "app", "dist");
    app.use(express.static(dist));
    // SPA fallback : toute route hors /api et /images renvoie index.html
    app.get(/^(?!\/(api|images|logos)).*/, (_req, res) => res.sendFile(join(dist, "index.html")));
  }

  // Filet de sécurité : toute erreur non gérée renvoie un 500 JSON plutôt que de laisser pendre la requête
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "server error" });
  });

  return app;
}
