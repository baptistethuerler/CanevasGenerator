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

  if (serveStatic) {
    const dist = join(__dirname, "..", "app", "dist");
    app.use(express.static(dist));
    // SPA fallback : toute route non-API renvoie index.html
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(dist, "index.html")));
  }

  return app;
}
