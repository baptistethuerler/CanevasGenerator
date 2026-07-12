# CLAUDE.md — Atelier de Stories (CanevasGenerator)

> Fichier de reprise. Lis-le en entier avant de continuer le projet dans un nouveau terminal.

## Le projet

**Atelier de Stories — Altitude** : petite app web **locale** qui permet à *Altitude Massage* de créer, gérer et exporter des visuels Instagram :
- **Stories** (vidéo verticale 1080×1920) — export MP4 **à venir (Phase 5b)**.
- **Posts** de feed (image PNG unique ou carrousel .zip, carré 1:1 ou portrait 4:5) — export **livré (Phase 5a)**.

Éditeur riche : contenu texte, styles typographiques configurables, fond couleur/image + voile, logo multi-positions, format. Rendu 100 % **canvas** (l'aperçu = l'export).

## Emplacement & pièges

- **Racine du projet : `/Users/baptiste/Documents/Travaux/Altitude/CanevasGenerator`** (déplacé ici récemment ; historique git intact).
- ⚠️ **Le cwd du shell se réinitialise** vers un ancien chemin après chaque commande. **Toujours préfixer** les commandes Bash par `cd "/Users/baptiste/Documents/Travaux/Altitude/CanevasGenerator" && …`.
- ⚠️ Ancien dossier à supprimer manuellement (Finder) : `/Users/manou/Desktop/Altitude/StoryReservation_26` (la suppression auto échouait par timeout de système de fichiers — Documents est probablement synchronisé iCloud). Ce n'est PLUS le projet de référence.
- Le dossier étant sous iCloud, éviter les opérations massives de fichiers (déplacer/supprimer `node_modules`) — elles peuvent caler.

## Tech stack

- **Front** : React 18 + TypeScript + Vite + Tailwind (+ design system « Sérénité » en CSS dans `app/src/index.css`).
- **Serveur** : Node.js + Express (`server/`) — sert le build de l'app + une API fichiers REST locale.
- **Rendu** : Canvas 2D (moteur unique partagé aperçu ↔ export), dans `app/src/lib/renderer/`.
- **Persistance** : fichiers JSON sur disque (`data/stories/*.json`, `data/posts/*.json`), assets dans `images/`, `logos/` (servis sur `/images`, `/logos`). Pas de base de données.
- **Tests** : Vitest (+ Supertest pour l'API). **78 tests** actuellement.
- **Export carrousel** : JSZip.

## Commandes

```bash
cd "/Users/baptiste/Documents/Travaux/Altitude/CanevasGenerator"
npm test          # Vitest (serveur + app) — doit être vert
npm run build     # tsc --noEmit && vite build
npm run dev       # dev : Vite (5173) + serveur API (4321), proxy /api /images /logos
npm start         # prod : build servi + API sur le port 4321, ouvre le navigateur
./Lancer.command  # raccourci double-clic (install + build + start)
```

Pour vérifier en navigateur : `NODE_ENV=production PORT=4321 node server/index.js &` puis `http://localhost:4321` (MCP Puppeteer dispo).

## Architecture (fichiers clés)

```
server/
  index.js            lanceur (dev/prod)
  app.js              fabrique Express : /api, /images, /logos, fallback SPA
  paths.js            chemins + création des dossiers
  store.js            CRUD documents JSON (create/get/list/update/patch/remove)
  assets.js           createAssets(dir, urlBase) — upload base64/list/remove (images ET logos)
  routes/             library.js, docs.js, assets.js
app/src/
  lib/
    model.ts          types + défauts + fabriques (Story/Slide/Line, StyleDef, Background/Overlay,
                      LogoPlacement, Crop/Filters) + ensureDocDefaults + effectiveBackground/effectiveLogos
    api.ts            client REST (docs + banque images/logos)
    filter.ts         filtrage/tri de la bibliothèque (pur)
    export.ts         export Post : loadResources → renderSlideToCanvas → PNG/zip → download
    renderer/
      layout.ts       mise en page pure (wrap + marges + surcharges de ligne)
      draw.ts         drawSlide (fond via drawBackground + texte + drawLogos), dimsFor, computeImageRect,
                      computeLogoRect  ← LE moteur, réutilisé par l'aperçu ET l'export
  components/
    Shell.tsx         barre latérale + topbar
    CanvasPreview.tsx aperçu canvas (charge images de fond + logos async)
    SlidesRail, ContentInspector, TextInspector, FormatInspector, MarginsEditor,
    BackgroundInspector, LogoInspector
  pages/
    Library.tsx       bibliothèque (listing filtrable + actions + « + Nouveau »)
    Editor.tsx        éditeur 3 colonnes + inspecteur à onglets (Contenu/Texte/Fond/Logo/Format) + export
  App.tsx             routeur d'état bibliothèque ↔ éditeur
```

**Modèle de données** : un document (Story/Post) = `{ id, type, format, title, status, date, styles, contentMargin, blockPosition, background, logos, slides[] }`. Un slide = `{ id, lines[], background?, logos? }` (surcharge par slide). Les anciens docs sont normalisés au chargement via `ensureDocDefaults`.

## Statut — phases (toutes fusionnées dans `main`)

- ✅ **Phase 1** — Fondations (serveur, API, dossiers, lancement)
- ✅ **Design « Sérénité »** — repris du projet Praxoria (`/Users/baptiste/Documents/Claude/praxoria`) : sauge `#4e7a63` / terracotta / crème, police **Nunito**
- ✅ **Phase 2** — Moteur de rendu + éditeur de base (créer/éditer/sauver une story, aperçu en direct, sauvegarde auto)
- ✅ **Phase 3** — Bibliothèque complète (filtres type/statut/période/recherche/tri, dupliquer/renommer/statut/supprimer) + **posts** (1:1, 4:5, éditeur format-aware)
- ✅ **Phase 4A** — Typographie & mise en page (styles configurables, marges liées/déliées, marge de contenu, position du bloc ; inspecteur à onglets)
- ✅ **Phase 4B-1** — Fond couleur + voile (aucun/uniforme/dégradé bas·haut·radial)
- ✅ **Phase 4B-2a** — Banque d'images + fond image (upload serveur, cover, chargement async)
- ✅ **Phase 4B-2b** — Ajustements d'image (zoom, point focal, luminosité, flou)
- ✅ **Phase 4C** — Logo (banque, placement multi-positions + libre, taille, opacité, portée story/slide)
- ✅ **Phase 5a** — Export Post (image PNG + carrousel .zip)

## PROCHAINE ÉTAPE — Phase 5b (à planifier puis exécuter)

**Phase 5b — Export Story MP4** (la pièce maîtresse restante) :
- Moteur d'animation : `buildStoryPhases(nbSlides, timing)` (pur, testable) → phases `in → hold → (cross → hold)×N` **SANS fondu sortant** → se termine sur un **hold final = dernière image figée** (exigence explicite de l'utilisateur : pas de fondu final qui ferait disparaître le texte).
- Rendu de frame par cross-fade (composer les slides voisins avec `globalAlpha`, idéalement via un canvas hors-écran par slide pour cross-fader fond+texte+logo).
- Enregistrement via **MediaRecorder** sur `canvas.captureStream(30)` → **MP4 H.264** (repli WebM), téléchargement.
- Ajouter `timing: { duration, transition }` au modèle (+ défauts 4.5 / 0.7) + curseurs durée/transition dans l'onglet **Format** (story uniquement).
- Réutiliser `export.ts` (loadResources, renderSlideToCanvas) déjà en place.
- Activer le bouton « 🎬 Vidéo » de la topbar (actuellement désactivé « bientôt » pour les stories dans `Editor.tsx`).
- Voir spec §10 (Rendu, dernière image figée) et §11 (Export).

Puis reste la **Phase 6 — Extras** : onglet **Marque** (palette/polices/logos par défaut), **Planning** (calendrier), **modèles**, **annuler/rétablir**, **glisser-déposer**.

## Méthodologie de travail (à SUIVRE)

Le projet suit **spec → plans par phase → exécution subagent-driven → revue → merge** :
1. Un plan détaillé par (sous-)phase dans `docs/superpowers/plans/` (TDD, code exact, ordre qui compile à chaque étape).
2. Exécution via **superpowers:subagent-driven-development** : une branche `phase-XX`, un sous-agent frais par tâche (modèle Sonnet, en synchrone), le contrôleur vérifie chaque commit (transcription conforme au plan + tests verts).
3. Pattern anti-rupture : quand une signature change (ex. `drawSlide`), rendre les nouvelles props/opts **optionnelles**, ou grouper les fichiers mutuellement dépendants dans une même tâche ; la tâche « moteur » ne lance que Vitest, `tsc` redevient propre à la tâche suivante.
4. **Relecture finale** par un sous-agent avant chaque merge ; appliquer les correctifs Importants, merger en `--no-ff`, supprimer la branche.
5. **Piège de typage récurrent** : une fonction `effectiveX(doc, slide)` doit typer `slide: Slide | null` (pas `{ x?: … }`) sinon les littéraux `Slide` des tests déclenchent le contrôle des propriétés excédentaires.

La **spec de conception** validée : `docs/superpowers/specs/2026-07-12-atelier-stories-altitude-design.md`. Les **plans** de chaque phase sont dans `docs/superpowers/plans/`.

## Conventions

- **Tout en français** (réponses, commentaires, messages de commit, docs). Les identifiants de code gardent leur forme.
- Front en React + shadcn/ui à la base, mais le design est un **CSS design system fait main** (classes dans `index.css`) — pas de shadcn installé pour l'instant.
- Suppression de fichiers : `trash`, pas `rm`.
- Commits : messages en français, terminés par `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` quand c'est un commit du contrôleur.
- TDD pour la logique pure (model, renderer, filter, store, assets) ; le code navigateur (canvas/DOM/export) se vérifie en navigateur (Puppeteer).

## Dettes mineures connues (non bloquantes, notées en revue)

- `TextInspector`/`Editor` : `setDoc({ ...doc, … })` par closure (updater fonctionnel plus sûr) — non atteignable via l'UI réelle.
- `CanvasPreview` : `logoImgs`/image de fond jamais purgés (croissance mémoire bornée, négligeable).
- `LogoInspector` : gère un seul placement (`logos[0]`) alors que le modèle est un tableau.
- Export « ⤓ Image » d'un post multi-slides = slide 0 (couverture) — libellé ambigu possible.
- `store`/`assets` : pas de liste blanche sur les corps de requête (app locale mono-utilisatrice).
