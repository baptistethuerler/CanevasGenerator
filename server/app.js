// server/app.js
import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { libraryRouter } from "./routes/library.js";
import { docsRouter } from "./routes/docs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp({ store, paths, serveStatic = true }) {
  const app = express();
  app.use(express.json({ limit: "20mb" }));

  app.use("/api", libraryRouter(store));
  app.use("/api", docsRouter(store));
  // 404 JSON pour toute route /api inconnue (cohérent avec les 404 des handlers)
  app.use("/api", (_req, res) => res.status(404).json({ error: "not found" }));

  if (serveStatic) {
    const dist = join(__dirname, "..", "app", "dist");
    app.use(express.static(dist));
    // SPA fallback : toute route non-API renvoie index.html
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(dist, "index.html")));
  }

  // Filet de sécurité : toute erreur non gérée renvoie un 500 JSON plutôt que de laisser pendre la requête
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "server error" });
  });

  return app;
}
