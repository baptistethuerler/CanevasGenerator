// server/index.js
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import open from "open";
import { makePaths, ensureDataDirs } from "./paths.js";
import { createStore } from "./store.js";
import { createApp } from "./app.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PORT = process.env.PORT || 4321;
const isProd = process.env.NODE_ENV === "production";

const paths = makePaths(root);
await ensureDataDirs(paths);
const store = createStore(paths);
const app = createApp({ store, paths, serveStatic: isProd });

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Atelier de Stories — serveur prêt sur ${url}`);
  if (isProd) open(url).catch(() => {});
});
