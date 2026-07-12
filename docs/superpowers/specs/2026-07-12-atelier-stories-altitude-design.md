# Atelier de Stories — Altitude · Document de conception

**Date :** 2026-07-12
**Statut :** Validé en brainstorming, en attente de relecture utilisateur
**Projet parent :** `StoryReservation_26` (évolution de `Generateur_Story.html`)

---

## 1. Objectif

Créer une petite application web **locale** qui permet à Altitude (praticienne massage) de **créer, gérer, visualiser et exporter** des visuels Instagram :

- des **Stories** (vidéo verticale animée 1080×1920),
- des **Posts** de feed (image fixe et/ou carrousel, carré ou portrait).

L'app remplace le fichier unique `Generateur_Story.html` par un véritable atelier, avec bibliothèque, réglages typographiques fins, banque d'images, logos et export.

### Critères de réussite

1. On lance l'app d'un **double-clic** (raccourci) et on arrive sur la bibliothèque.
2. On crée une Story ou un Post, on l'édite avec un **aperçu en direct**, on l'**exporte** (MP4 pour story, images pour post).
3. Les données (stories, posts, images, logos, polices) sont **stockées sur disque** dans des dossiers visibles dans le Finder.
4. La **dernière image d'une story reste figée** en fin de vidéo (pas de fondu final qui ferait disparaître le texte).

---

## 2. Périmètre (v1 = complet)

Toutes les fonctionnalités listées ci-dessous sont dans la **v1** (l'utilisateur a demandé l'ensemble).

**Cœur :** bibliothèque stories + posts · éditeur multi-slides · styles de texte réutilisables et configurables · surcharge par ligne · marges (dont valeur unifiée) · marge de contenu 50 px · banque d'images de fond · fond par story + surcharge par slide · logos multi-positions · export Story MP4 (dernière image figée) · export Post image + carrousel.

**Bonus (tous inclus) :** glisser-déposer · annuler/rétablir · dupliquer · modèles · voile (uniforme + dégradé) · alignements · zones de sécurité Instagram · alerte débordement · palette de marque · polices personnalisées · logo positionnable · recadrage/zoom du fond · filtres (luminosité, flou) · planning éditorial · export groupé (zip) · durée & transition par slide · statut brouillon/prêt.

**Conservé de l'app actuelle :** aperçu animé en direct · sauvegarde automatique · archivage des anciennes versions · banque d'icônes SVG.

---

## 3. Architecture technique

**Base validée : React + shadcn/ui + petit serveur Node.**

| Couche | Technologie |
|--------|-------------|
| Interface | **React + TypeScript**, **Vite**, **Tailwind CSS**, **shadcn/ui** |
| Rendu visuel | **Canvas 2D** (moteur unique partagé aperçu ↔ export), portage du moteur actuel |
| Serveur local | **Node.js** (Express léger) : sert l'app + API fichiers |
| Persistance | Fichiers **JSON** + assets sur disque (pas de base de données) |
| Export vidéo | **MediaRecorder** sur `canvas.captureStream()` (MP4 H.264, repli WebM) |
| Export image | `canvas.toBlob()` (PNG/JPG) ; carrousel groupé en **.zip** (JSZip) |
| Polices | fichiers dans `/fonts`, chargés via `FontFace` / `@font-face` |

### Lancement

Un fichier **`Lancer.command`** (macOS, double-cliquable) qui :
1. au 1er lancement, exécute `npm install` si besoin ;
2. démarre le serveur Node (`npm start`) — le serveur sert l'app compilée **et** l'API ;
3. ouvre `http://localhost:<port>` dans le navigateur.

> Le serveur Express sert le build Vite **et** expose l'API fichiers sur le même port → une seule commande, un seul port, pas de CORS.

### API fichiers (REST, local uniquement)

- `GET /api/library` → liste des stories + posts (métadonnées).
- `GET /api/doc/:id` · `PUT /api/doc/:id` · `POST /api/doc` · `DELETE /api/doc/:id`.
- `GET /api/assets/:kind` (kind = images | logos | fonts) · `POST /api/assets/:kind` (upload) · `DELETE`.
- `GET /api/brand` · `PUT /api/brand` (palette, polices actives, réglages par défaut).
- `POST /api/export` (optionnel : archivage/rangement des exports côté disque).

---

## 4. Structure de dossiers sur disque

```
AtelierStories/
├─ Lancer.command          ← double-clic pour démarrer
├─ server/                 ← serveur Node (API + service du build)
├─ app/                    ← build de l'interface React (servi par le serveur)
├─ data/
│  ├─ stories/*.json       ← une story par fichier
│  ├─ posts/*.json         ← un post par fichier
│  ├─ brand.json           ← palette, polices actives, styles par défaut, logos
│  └─ templates/*.json     ← modèles réutilisables
├─ images/                 ← banque d'images de fond (uploads)
├─ logos/                  ← banque de logos (uploads)
├─ fonts/                  ← polices personnalisées (uploads)
└─ exports/                ← MP4 / images générés
   └─ Archives/            ← anciennes versions déplacées automatiquement
```

Chaque document (story/post) est **isolé dans son propre fichier JSON** → duplication et gestion indépendantes (principe déjà mis en place dans l'app actuelle, ici porté sur disque).

---

## 5. Formats

| Format | Dimensions | Sortie |
|--------|-----------|--------|
| **Story** | 1080 × 1920 (9:16) | Vidéo MP4 animée |
| **Post carré** | 1080 × 1080 (1:1) | Image(s) PNG/JPG |
| **Post portrait** | 1080 × 1350 (4:5) | Image(s) PNG/JPG |

**Marge de contenu** globale : **50 px par défaut** (zone de sécurité dans laquelle le texte est mis en page), réglable, avec option **valeur unifiée / par côté**.

---

## 6. Modèle de données

### Document (Story ou Post)

```jsonc
{
  "id": "uuid",
  "type": "story" | "post",
  "format": "9:16" | "1:1" | "4:5",
  "postMode": "single" | "carousel",   // posts uniquement
  "title": "Dispos juillet",
  "status": "draft" | "ready",
  "date": "2026-07-11",                 // date affichée/filtrable
  "createdAt": "...", "updatedAt": "...",
  "contentMargin": { "linked": true, "value": 50,
                     "top": 50, "right": 50, "bottom": 50, "left": 50 },
  "blockPosition": "top" | "center" | "bottom",
  "background": { /* fond par défaut du document, voir §6.3 */ },
  "logos": [ /* placements de logo par défaut, voir §6.4 */ ],
  "timing": { "duration": 4.5, "transition": 0.7 },  // story, valeurs globales
  "styles": { /* jeu de styles PROPRE au document, voir §6.3 */ },
  "slides": [ /* voir §6.1 */ ]
}
```

> **Date :** `date` = date de publication **prévue** (sert au filtre Période et au Planning), initialisée à la date de création, modifiable.

### 6.1 Slide

```jsonc
{
  "id": "uuid",
  "name": "Dispos",
  "lines": [ /* voir §6.2 */ ],
  "background": null | { /* surcharge du fond pour ce slide */ },
  "logos": null | [ /* surcharge des logos pour ce slide */ ],
  "timing": null | { "duration": 5, "transition": 0.6 }  // surcharge par slide
}
```

### 6.2 Ligne de texte

```jsonc
{
  "id": "uuid",
  "style": "title" | "subtitle" | "text" | "bullet" | "arrow" | "note",
  "text": "Mes disponibilités",
  "icon": "leaf" | "none" | ...,
  "override": null | { /* propriétés de style surchargées pour CETTE ligne */ }
}
```

### 6.3 Styles (propres au document, initialisés depuis les défauts de marque)

Chaque document possède son **propre jeu de styles**, copié depuis les **styles par défaut** de `brand.json` à la création. Les éditer dans le panneau « Texte » n'affecte **que ce document**. Un bouton « Enregistrer comme défaut de marque » permet de repousser un style vers `brand.json` pour les futures créations.


```jsonc
{
  "title": {
    "font": "Erode",
    "size": 78,
    "color": "#ffffff",
    "align": "left" | "center",
    "lineHeight": 1.12,
    "margins": { "linked": false, "top": 0, "bottom": 24, "left": 0, "right": 0 },
    "mark": null | "•" | "→",
    "indent": 0
  },
  "subtitle": { ... }, "text": { ... }, "bullet": { ... }, "arrow": { ... }, "note": { ... }
}
```

Une **ligne** hérite de son style ; `override` remplace ponctuellement certaines propriétés (police, corps, couleur, marges, alignement…).

### 6.4 Fond

```jsonc
{
  "kind": "image" | "color",
  "imageRef": "images/fond1.png",     // si image
  "color": "#81a9a3",                 // si couleur
  "crop": { "zoom": 1.2, "x": 0.5, "y": 0.4 },  // point focal + zoom
  "filters": { "brightness": 1.0, "blur": 0 },
  "overlay": {
    "type": "none" | "uniform" | "gradient",
    "color": "#000000",
    "intensity": 0.55,
    "direction": "bottom" | "top" | "radial",  // si gradient
    "softness": 0.5
  }
}
```

### 6.5 Placement de logo

```jsonc
{
  "logoRef": "logos/altitude.png",
  "anchors": ["top-left", "bottom-right"],  // une OU plusieurs positions
  "free": null | { "x": 0.8, "y": 0.9 },    // position libre optionnelle
  "size": 0.12,      // fraction de la largeur
  "opacity": 0.9
}
```

---

## 7. Interface — Bibliothèque

Écran d'accueil. Navigation par onglets : **Créations · 📅 Planning · 🎨 Marque**.

- **Barre de filtres sur une seule ligne compacte** : recherche par titre · Type (tous/Story/Post) · Statut (tous/Brouillon/Prêt) · Période (par mois) · Tri (date, titre, statut). Défilement horizontal si l'écran est étroit (jamais deux lignes).
- **Listing (tableau)** : colonnes *vignette · Titre (+ nb de slides) · Type · Date · Statut · Actions*.
- **Actions par ligne** : Ouvrir (clic sur la ligne), Dupliquer (⧉), Exporter (⤓), Renommer/Supprimer (⋯).
- **Bouton « + Nouveau »** : demande Story ou Post, puis le format.
- **Onglet Planning** : vue calendrier mensuel positionnant les créations par date.
- **Onglet Marque** : palette de couleurs, polices actives (+ upload), logos (+ upload), styles par défaut.

---

## 8. Interface — Éditeur (3 colonnes)

Ouvert au clic sur une ligne de la bibliothèque.

- **Barre du haut** : ← Bibliothèque · titre éditable · format · statut (Brouillon/Prêt) · **Annuler/Rétablir** · **Exporter**.
- **Colonne gauche — Slides** (resserrée) : vignettes numérotées, **glisser-déposer** pour réordonner, ajouter, dupliquer, supprimer.
- **Centre — Aperçu maximisé** (élément dominant, grandit avec la fenêtre) : rendu canvas animé, **▶ Lire**, bascule **zones de sécurité**, **alerte débordement**, timeline/scrubber.
- **Colonne droite — Inspecteur à onglets** : Contenu · Texte · Fond · Logo · Format (§9).

---

## 9. Inspecteur — panneaux

- **Contenu** : liste des lignes (texte, style, icône, italique), ajouter/réordonner/supprimer une ligne, activer la **surcharge** d'une ligne.
- **Texte (styles & marges)** : choix du style à régler (édite le style **de ce document**) · police (+ ajouter la sienne) · corps · couleur (palette) · alignement · **marges avec bouton 🔗 « lier » (valeur unique) / délier (4 côtés)** · interligne · surcharge de la ligne sélectionnée · bouton « Enregistrer comme défaut de marque ».
- **Fond** : bascule Image/Couleur · banque d'images (+ upload) · recadrage/zoom/point focal · luminosité · flou · **voile** (aucun / uniforme / **dégradé** avec direction bas·haut·radial, intensité, douceur, couleur) · appliqué à toute la story ou au slide.
- **Logo** : choix du logo (+ upload) · **emplacements multiples** (cases à cocher sur une grille 9 ancrages) · **position libre** optionnelle (glisser sur l'aperçu) · taille · opacité · sur tous les slides ou un seul.
- **Format** : Story 9:16 / Post 1:1 / Post 4:5 · **marge de contenu (50 px, liable)** · position du bloc (haut/centre/bas) · durée & transition (globales **+ par slide**) · pour les posts : « 1 image » ou « carrousel ».

---

## 10. Rendu & animation

Un **moteur de rendu canvas unique** (module `renderer`) produit à la fois l'aperçu et l'export → « ce que tu vois est ce que tu obtiens ».

- Mise en page : chaque style calcule ses lignes (retour à la ligne, marges, alignement), centrées dans la zone de contenu (marge globale + marges de style).
- **Phases d'animation dynamiques** (déjà porté dans l'app actuelle) : `in → hold → (cross → hold)×N → fin`, générées pour un nombre quelconque de slides.
- **Dernière image figée** : en fin de story, **pas de phase de fondu sortant** — la vidéo se termine sur un **hold final** qui maintient le dernier slide affiché (le texte ne disparaît pas). Une courte durée de maintien final est ajoutée pour que la fin « respire ».
- **Zones de sécurité** : overlay indicatif (non exporté) matérialisant les zones occupées par l'UI Instagram.
- **Alerte débordement** : si le contenu dépasse la zone de sécurité, un indicateur prévient (non exporté).

---

## 11. Export

- **Story → MP4** : enregistrement du canvas via MediaRecorder (H.264, repli WebM), 1080×1920, avec **dernière image figée**. Rangement dans `/exports`, anciennes versions déplacées dans `/exports/Archives/`.
- **Post image unique → PNG/JPG** (1080×1080 ou 1080×1350).
- **Post carrousel → série d'images**, exportables groupées en **.zip** (un fichier par slide, numérotés).
- Nommage clair et daté ; archivage automatique des versions précédentes.

---

## 12. Fonctionnalités transverses

- **Sauvegarde automatique** à chaque modification (écriture JSON via l'API), avec indicateur « ✓ Enregistré ».
- **Annuler / Rétablir** (historique en mémoire dans l'éditeur).
- **Dupliquer** story / post / slide.
- **Modèles** : enregistrer un document comme modèle, en créer un nouveau à partir d'un modèle.
- **Glisser-déposer** pour slides et lignes.
- **Statut** brouillon/prêt (badge + filtre).
- **Planning** éditorial (vue calendrier).
- **Palette de marque, polices, logos** réutilisables (onglet Marque).

---

## 13. Découpage en modules

Chaque module a une responsabilité claire et une interface définie :

1. `server` — API fichiers + service du build (Node/Express).
2. `renderer` — moteur canvas (layout + dessin + phases d'animation), **sans dépendance à React**, réutilisable pour aperçu et export.
3. `exporter` — MP4 (MediaRecorder) et images/zip, s'appuie sur `renderer`.
4. `library` — écran bibliothèque (listing, filtres, actions).
5. `editor` — écran éditeur (slides, aperçu, inspecteur).
6. `inspector/*` — un composant par panneau (Contenu, Texte, Fond, Logo, Format).
7. `brand` — palette, polices, logos, styles par défaut.
8. `store` — état de l'app + synchronisation avec l'API (sauvegarde auto, undo/redo).
9. `assets` — gestion des uploads (images, logos, polices).

---

## 14. Gestion d'erreurs

- Upload d'un fichier non supporté → message clair, refus.
- Police invalide → repli sur Erode/serif.
- Export non supporté par le navigateur (MP4) → repli WebM + note à l'utilisateur (comme aujourd'hui).
- Écriture disque échouée → notification, pas de perte de l'état en mémoire.
- Document JSON corrompu → repli sécurisé + sauvegarde de secours.

---

## 15. Vérification (avant de déclarer terminé)

- Créer, éditer, sauvegarder, rouvrir une Story et un Post (persistance disque).
- Aperçu = export (mêmes marges, mêmes polices).
- Story exportée : dernière image **figée**, texte visible jusqu'au bout.
- Post carrousel : bonne série d'images, zip correct.
- Filtres bibliothèque (type/statut/période/recherche/tri).
- Marges liées/déliées, voile dégradé, logo multi-positions rendus correctement.
- Tests navigateur (Puppeteer) sur les parcours clés.

---

## 16. Hors périmètre (v-future éventuelle)

- Application de bureau native (Tauri) à double-clic sans serveur.
- Publication directe vers Instagram (API).
- Collaboration multi-utilisateurs / cloud.
- Musique/audio sur les stories.
```
