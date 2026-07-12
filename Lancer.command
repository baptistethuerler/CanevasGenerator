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
