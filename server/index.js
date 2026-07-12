// server/index.js
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readdir, copyFile, access } from "node:fs/promises";
import open from "open";
import { makePaths, ensureDataDirs } from "./paths.js";

const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;

/** Importe les images déposées dans fonds/ vers la banque images/ (idempotent, par nom de fichier). */
async function importFonds(fondsDir, imagesDir) {
  let files = [];
  try { files = await readdir(fondsDir); } catch { return; }
  for (const f of files) {
    if (!IMG_RE.test(f)) continue;
    const dest = join(imagesDir, f);
    try { await access(dest); continue; } catch { /* n'existe pas encore → on copie */ }
    try { await copyFile(join(fondsDir, f), dest); } catch { /* ignoré */ }
  }
}
import { createStore } from "./store.js";
import { createApp } from "./app.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PORT = process.env.PORT || 4321;
const isProd = process.env.NODE_ENV === "production";

const paths = makePaths(root);
await ensureDataDirs(paths);
await importFonds(paths.fonds, paths.images);
const store = createStore(paths);
const app = createApp({ store, paths, serveStatic: isProd });

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Atelier de Stories — serveur prêt sur ${url}`);
  if (isProd && process.env.ATELIER_NO_OPEN !== "1") open(url).catch(() => {});
});
