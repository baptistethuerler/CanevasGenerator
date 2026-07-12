# Atelier de Stories — Phase 1 : Fondations · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser le squelette du projet — un serveur Node local qui sert une interface React et une API fichiers, avec la structure de dossiers sur disque, lançable par un double-clic, affichant une bibliothèque vide.

**Architecture:** Monorepo à un seul `package.json`. L'interface (React + TypeScript + Vite + Tailwind + shadcn/ui) vit dans `app/`. Un serveur Express (`server/`) sert le build de l'app **et** expose une API REST locale qui lit/écrit des fichiers JSON dans `data/`. En développement, Vite tourne à part avec un proxy `/api` vers le serveur ; en production, le serveur sert le build compilé sur un port unique.

**Tech Stack:** React 18, Vite 5, TypeScript, Tailwind CSS 3, shadcn/ui, Express 4, Vitest + Supertest (tests), concurrently, open.

**Référence spec :** `docs/superpowers/specs/2026-07-12-atelier-stories-altitude-design.md` (§3 Architecture, §4 Dossiers, §7 Bibliothèque).

---

## Structure de fichiers créée dans cette phase

```
StoryReservation_26/
├─ package.json               ← scripts + dépendances (racine unique)
├─ Lancer.command             ← double-clic : install + start + ouvre le navigateur
├─ vite.config.ts             ← config Vite (root=app, proxy /api en dev)
├─ tailwind.config.js
├─ postcss.config.js
├─ tsconfig.json
├─ vitest.config.ts
├─ server/
│  ├─ index.js                ← démarre Express, sert app/dist + API, ouvre le navigateur
│  ├─ paths.js                ← chemins des dossiers de données + création au démarrage
│  ├─ store.js                ← lecture/écriture des documents JSON
│  └─ routes/
│     ├─ library.js           ← GET /api/library
│     └─ docs.js              ← CRUD /api/doc
├─ server/__tests__/
│  ├─ paths.test.js
│  ├─ store.test.js
│  └─ api.test.js
├─ app/
│  ├─ index.html
│  └─ src/
│     ├─ main.tsx
│     ├─ App.tsx
│     ├─ index.css            ← directives Tailwind + thème
│     ├─ lib/api.ts           ← client fetch de l'API
│     └─ pages/Library.tsx    ← page bibliothèque (état vide)
└─ data/                      ← créé au démarrage (stories/, posts/, templates/, brand.json)
```

> Les dossiers `images/`, `logos/`, `fonts/`, `exports/` sont aussi créés au démarrage mais exploités dans les phases suivantes.

---

## Task 1 : Initialiser le projet Node et les dépendances

**Files:**
- Create: `package.json`

- [ ] **Step 1 : Créer `package.json`**

```json
{
  "name": "atelier-stories-altitude",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently -k -n SERVER,VITE \"node server/index.js\" \"vite\"",
    "build": "vite build",
    "start": "cross-env NODE_ENV=production node server/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^4.19.2",
    "open": "^10.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "concurrently": "^8.2.2",
    "cross-env": "^7.0.3",
    "postcss": "^8.4.39",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "supertest": "^7.0.0",
    "tailwindcss": "^3.4.6",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "vitest": "^2.0.4"
  }
}
```

- [ ] **Step 2 : Installer**

Run: `npm install`
Expected: `node_modules/` créé, aucune erreur fatale.

- [ ] **Step 3 : Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: init projet Atelier de Stories (dépendances)"
```

---

## Task 2 : Module `paths` — chemins et création des dossiers

**Files:**
- Create: `server/paths.js`
- Test: `server/__tests__/paths.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

```js
// server/__tests__/paths.test.js
import { describe, it, expect, afterEach } from "vitest";
import { rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { makePaths, ensureDataDirs } from "../paths.js";

const tmp = join(process.cwd(), ".tmp-test-data");

afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

describe("paths", () => {
  it("expose les sous-dossiers attendus", () => {
    const p = makePaths(tmp);
    expect(p.stories).toBe(join(tmp, "data", "stories"));
    expect(p.posts).toBe(join(tmp, "data", "posts"));
    expect(p.images).toBe(join(tmp, "images"));
    expect(p.logos).toBe(join(tmp, "logos"));
    expect(p.fonts).toBe(join(tmp, "fonts"));
    expect(p.exports).toBe(join(tmp, "exports"));
  });

  it("crée tous les dossiers de données", async () => {
    const p = makePaths(tmp);
    await ensureDataDirs(p);
    for (const dir of [p.stories, p.posts, p.templates, p.images, p.logos, p.fonts, p.exports]) {
      const s = await stat(dir);
      expect(s.isDirectory()).toBe(true);
    }
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run server/__tests__/paths.test.js`
Expected: FAIL — `Cannot find module '../paths.js'`.

- [ ] **Step 3 : Implémenter `server/paths.js`**

```js
// server/paths.js
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export function makePaths(root) {
  const data = join(root, "data");
  return {
    root,
    data,
    stories: join(data, "stories"),
    posts: join(data, "posts"),
    templates: join(data, "templates"),
    brand: join(data, "brand.json"),
    images: join(root, "images"),
    logos: join(root, "logos"),
    fonts: join(root, "fonts"),
    exports: join(root, "exports"),
    archives: join(root, "exports", "Archives"),
  };
}

export async function ensureDataDirs(p) {
  for (const dir of [p.stories, p.posts, p.templates, p.images, p.logos, p.fonts, p.exports, p.archives]) {
    await mkdir(dir, { recursive: true });
  }
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `npx vitest run server/__tests__/paths.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add server/paths.js server/__tests__/paths.test.js
git commit -m "feat(server): module paths + création des dossiers de données"
```

---

## Task 3 : Module `store` — lecture/écriture des documents JSON

**Files:**
- Create: `server/store.js`
- Test: `server/__tests__/store.test.js`

Un « document » est une story ou un post. Il est rangé selon son champ `type` dans `data/stories` ou `data/posts`, dans un fichier `<id>.json`.

- [ ] **Step 1 : Écrire le test qui échoue**

```js
// server/__tests__/store.test.js
import { describe, it, expect, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { makePaths, ensureDataDirs } from "../paths.js";
import { createStore } from "../store.js";

const tmp = join(process.cwd(), ".tmp-test-store");

afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

async function freshStore() {
  const p = makePaths(tmp);
  await ensureDataDirs(p);
  return createStore(p);
}

describe("store", () => {
  it("crée un document avec un id et le relit", async () => {
    const store = await freshStore();
    const doc = await store.create({ type: "story", title: "Test", slides: [] });
    expect(doc.id).toBeTruthy();
    const read = await store.get(doc.id);
    expect(read.title).toBe("Test");
    expect(read.type).toBe("story");
  });

  it("liste les documents (métadonnées)", async () => {
    const store = await freshStore();
    await store.create({ type: "story", title: "A", slides: [] });
    await store.create({ type: "post", title: "B", slides: [] });
    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(list.map((d) => d.title).sort()).toEqual(["A", "B"]);
  });

  it("met à jour et supprime", async () => {
    const store = await freshStore();
    const doc = await store.create({ type: "story", title: "X", slides: [] });
    await store.update(doc.id, { ...doc, title: "Y" });
    expect((await store.get(doc.id)).title).toBe("Y");
    await store.remove(doc.id);
    await expect(store.get(doc.id)).rejects.toThrow();
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run server/__tests__/store.test.js`
Expected: FAIL — `Cannot find module '../store.js'`.

- [ ] **Step 3 : Implémenter `server/store.js`**

```js
// server/store.js
import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const dirFor = (p, type) => (type === "post" ? p.posts : p.stories);

export function createStore(p) {
  async function readAll() {
    const out = [];
    for (const [type, dir] of [["story", p.stories], ["post", p.posts]]) {
      let files = [];
      try { files = await readdir(dir); } catch { files = []; }
      for (const f of files) {
        if (!f.endsWith(".json")) continue;
        try {
          const doc = JSON.parse(await readFile(join(dir, f), "utf8"));
          out.push(doc);
        } catch { /* fichier corrompu : ignoré du listing */ }
      }
    }
    return out;
  }

  async function findFile(id) {
    const all = await readAll();
    const doc = all.find((d) => d.id === id);
    if (!doc) throw new Error(`Document introuvable : ${id}`);
    return { doc, path: join(dirFor(p, doc.type), `${id}.json`) };
  }

  return {
    async create(input) {
      const now = new Date().toISOString();
      const doc = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        status: "draft",
        ...input,
      };
      await writeFile(join(dirFor(p, doc.type), `${doc.id}.json`), JSON.stringify(doc, null, 2));
      return doc;
    },
    async get(id) {
      const { doc } = await findFile(id);
      return doc;
    },
    async list() {
      const all = await readAll();
      // Métadonnées seulement (on retire slides pour alléger le listing)
      return all.map(({ slides, ...meta }) => ({ ...meta, slideCount: Array.isArray(slides) ? slides.length : 0 }));
    },
    async update(id, next) {
      const { path } = await findFile(id);
      const doc = { ...next, id, updatedAt: new Date().toISOString() };
      await writeFile(path, JSON.stringify(doc, null, 2));
      return doc;
    },
    async remove(id) {
      const { path } = await findFile(id);
      await unlink(path);
    },
  };
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `npx vitest run server/__tests__/store.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5 : Commit**

```bash
git add server/store.js server/__tests__/store.test.js
git commit -m "feat(server): store JSON (create/get/list/update/remove)"
```

---

## Task 4 : Routes API + application Express

**Files:**
- Create: `server/routes/library.js`, `server/routes/docs.js`, `server/app.js`
- Test: `server/__tests__/api.test.js`

On sépare la **fabrique d'app Express** (`app.js`, testable sans écouter de port) du **lanceur** (`index.js`, Task 5).

- [ ] **Step 1 : Écrire le test qui échoue**

```js
// server/__tests__/api.test.js
import { describe, it, expect, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import request from "supertest";
import { makePaths, ensureDataDirs } from "../paths.js";
import { createStore } from "../store.js";
import { createApp } from "../app.js";

const tmp = join(process.cwd(), ".tmp-test-api");
afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

async function freshApp() {
  const p = makePaths(tmp);
  await ensureDataDirs(p);
  return createApp({ store: createStore(p), paths: p, serveStatic: false });
}

describe("API", () => {
  it("GET /api/library renvoie une liste vide au départ", async () => {
    const app = await freshApp();
    const res = await request(app).get("/api/library");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /api/doc crée puis GET /api/doc/:id relit", async () => {
    const app = await freshApp();
    const create = await request(app).post("/api/doc").send({ type: "story", title: "Hello", slides: [] });
    expect(create.status).toBe(201);
    const id = create.body.id;
    const get = await request(app).get(`/api/doc/${id}`);
    expect(get.status).toBe(200);
    expect(get.body.title).toBe("Hello");
  });

  it("PUT met à jour, DELETE supprime", async () => {
    const app = await freshApp();
    const { body } = await request(app).post("/api/doc").send({ type: "story", title: "A", slides: [] });
    await request(app).put(`/api/doc/${body.id}`).send({ ...body, title: "B" }).expect(200);
    await request(app).get(`/api/doc/${body.id}`).expect(200).then((r) => expect(r.body.title).toBe("B"));
    await request(app).delete(`/api/doc/${body.id}`).expect(200);
    await request(app).get(`/api/doc/${body.id}`).expect(404);
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `npx vitest run server/__tests__/api.test.js`
Expected: FAIL — `Cannot find module '../app.js'`.

- [ ] **Step 3 : Implémenter les routes**

```js
// server/routes/library.js
import { Router } from "express";

export function libraryRouter(store) {
  const r = Router();
  r.get("/library", async (_req, res) => {
    res.json(await store.list());
  });
  return r;
}
```

```js
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
```

- [ ] **Step 4 : Implémenter `server/app.js`**

```js
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
```

- [ ] **Step 5 : Lancer le test (succès attendu)**

Run: `npx vitest run server/__tests__/api.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6 : Commit**

```bash
git add server/app.js server/routes/library.js server/routes/docs.js server/__tests__/api.test.js
git commit -m "feat(server): API library + CRUD documents (Express)"
```

---

## Task 5 : Lanceur du serveur

**Files:**
- Create: `server/index.js`

- [ ] **Step 1 : Implémenter `server/index.js`**

```js
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
```

- [ ] **Step 2 : Vérifier le démarrage manuellement**

Run: `PORT=4321 node server/index.js`
Expected: affiche `serveur prêt sur http://localhost:4321`. Dans un autre terminal : `curl http://localhost:4321/api/library` → `[]`. Puis Ctrl-C.

- [ ] **Step 3 : Commit**

```bash
git add server/index.js
git commit -m "feat(server): lanceur (dev/prod) + ouverture navigateur en prod"
```

---

## Task 6 : Configuration Vite + TypeScript + Tailwind

**Files:**
- Create: `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.js`, `postcss.config.js`, `vitest.config.ts`, `app/index.html`, `app/src/index.css`

- [ ] **Step 1 : `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: "app",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./app/src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:4321" },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
```

- [ ] **Step 2 : `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["app/src/*"] }
  },
  "include": ["app/src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3 : `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4 : `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/index.html", "./app/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        creme: "#fdfbf7", sage: "#81a9a3", "sage-deep": "#6f948d",
        "sage-light": "#9dd0c8", ink: "#33474a", muted: "#8a9694",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5 : `postcss.config.js`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 6 : `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.js"],
  },
});
```

- [ ] **Step 7 : `app/index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Atelier de Stories — Altitude</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8 : `app/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { @apply bg-creme text-ink; font-family: Georgia, serif; }
```

- [ ] **Step 9 : Commit**

```bash
git add vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.js postcss.config.js vitest.config.ts app/index.html app/src/index.css
git commit -m "chore: config Vite + TypeScript + Tailwind + Vitest"
```

---

## Task 7 : Coquille React + client API + page Bibliothèque (état vide)

**Files:**
- Create: `app/src/main.tsx`, `app/src/App.tsx`, `app/src/lib/api.ts`, `app/src/pages/Library.tsx`

- [ ] **Step 1 : `app/src/lib/api.ts`**

```ts
export type DocMeta = {
  id: string;
  type: "story" | "post";
  title: string;
  status: "draft" | "ready";
  date?: string;
  updatedAt: string;
  slideCount: number;
};

export async function fetchLibrary(): Promise<DocMeta[]> {
  const res = await fetch("/api/library");
  if (!res.ok) throw new Error("Échec du chargement de la bibliothèque");
  return res.json();
}
```

- [ ] **Step 2 : `app/src/pages/Library.tsx`**

```tsx
import { useEffect, useState } from "react";
import { fetchLibrary, type DocMeta } from "@/lib/api";

export function Library() {
  const [docs, setDocs] = useState<DocMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLibrary().then(setDocs).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 px-6 py-3 bg-white border-b border-black/10">
        <div className="w-7 h-7 rounded-lg bg-sage grid place-items-center text-white">🌿</div>
        <b>Atelier Altitude</b>
      </header>
      <main className="p-6">
        {error && <p className="text-red-600">{error}</p>}
        {!error && docs === null && <p className="text-muted">Chargement…</p>}
        {docs && docs.length === 0 && (
          <div className="text-center text-muted py-20">
            <p className="text-lg">Aucune création pour l'instant.</p>
            <p className="text-sm mt-2">Le bouton « + Nouveau » arrivera en Phase 3.</p>
          </div>
        )}
        {docs && docs.length > 0 && (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="px-4 py-2 bg-white rounded-lg border border-black/10">
                {d.title} — {d.type} — {d.slideCount} slides
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3 : `app/src/App.tsx`**

```tsx
import { Library } from "@/pages/Library";

export default function App() {
  return <Library />;
}
```

- [ ] **Step 4 : `app/src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5 : Vérifier en développement**

Run: `npm run dev`
Expected: Vite sur `http://localhost:5173`, serveur API sur `4321`. Ouvrir `http://localhost:5173` → en-tête « Atelier Altitude » + « Aucune création pour l'instant. » (le proxy `/api/library` renvoie `[]`). Puis Ctrl-C.

- [ ] **Step 6 : Vérifier le build de production**

Run: `npm run build && PORT=4321 NODE_ENV=production node server/index.js`
Expected: le navigateur s'ouvre sur `http://localhost:4321` et affiche la même bibliothèque vide, servie par Express. Puis Ctrl-C.

- [ ] **Step 7 : Commit**

```bash
git add app/src/main.tsx app/src/App.tsx app/src/lib/api.ts app/src/pages/Library.tsx
git commit -m "feat(app): coquille React + page bibliothèque (état vide)"
```

---

## Task 8 : Raccourci de lancement `Lancer.command`

**Files:**
- Create: `Lancer.command`

- [ ] **Step 1 : Créer `Lancer.command`**

```bash
#!/bin/bash
# Double-clic pour lancer l'Atelier de Stories
cd "$(dirname "$0")" || exit 1

if [ ! -d node_modules ]; then
  echo "Première installation, patiente…"
  npm install || { echo "Échec de l'installation."; read -r; exit 1; }
fi

if [ ! -d app/dist ]; then
  echo "Préparation de l'interface…"
  npm run build || { echo "Échec du build."; read -r; exit 1; }
fi

echo "Démarrage de l'Atelier de Stories…"
NODE_ENV=production node server/index.js
```

- [ ] **Step 2 : Rendre exécutable**

Run: `chmod +x Lancer.command`
Expected: aucun retour ; `ls -l Lancer.command` montre les droits `x`.

- [ ] **Step 3 : Vérifier**

Run: `./Lancer.command`
Expected: build (si absent) puis serveur démarré, navigateur ouvert sur la bibliothèque vide. Ctrl-C pour arrêter.

- [ ] **Step 4 : Commit**

```bash
git add Lancer.command
git commit -m "feat: raccourci Lancer.command (install + build + start)"
```

---

## Task 9 : Vérification finale de la phase

- [ ] **Step 1 : Toute la suite de tests passe**

Run: `npm test`
Expected: tous les tests serveur PASS (paths, store, api).

- [ ] **Step 2 : Nettoyage des dossiers temporaires de test**

Run: `rm -rf .tmp-test-data .tmp-test-store .tmp-test-api`
Expected: aucun dossier `.tmp-test-*` restant (ils sont créés/supprimés par les tests, ce nettoyage est une sécurité).

- [ ] **Step 3 : Ajouter les dossiers temporaires au `.gitignore`**

Ajouter à `.gitignore` :

```
# Dossiers temporaires de test
.tmp-test-*
data/
```

> `data/` est ignoré par git : ce sont les créations locales de l'utilisatrice, pas du code. `brand.json` par défaut sera généré à l'exécution (Phase 6).

- [ ] **Step 4 : Commit**

```bash
git add .gitignore
git commit -m "chore: ignore dossiers temporaires de test et data/"
```

---

## Definition of Done (Phase 1)

- `npm test` : vert (paths, store, api).
- `npm run dev` : bibliothèque vide accessible sur `localhost:5173`, API proxifiée.
- `./Lancer.command` : build + serveur + navigateur ouvert sur la bibliothèque vide (port unique 4321).
- Structure de dossiers `data/`, `images/`, `logos/`, `fonts/`, `exports/Archives/` créée au démarrage.
- Base prête pour la **Phase 2 (moteur de rendu + éditeur de base)**.
