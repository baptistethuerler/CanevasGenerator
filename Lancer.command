#!/bin/bash
# Double-clic pour lancer l'Atelier de Stories.
# Le serveur démarre en arrière-plan, le navigateur s'ouvre, puis cette fenêtre se ferme.
# Relançable à tout moment : si l'app tourne déjà, on ouvre simplement le navigateur
# (pas besoin de fermer le Terminal au préalable).
cd "$(dirname "$0")" || exit 1

URL="http://localhost:4321"

if [ ! -d node_modules ]; then
  echo "Première installation, patiente…"
  npm install || { echo "Échec de l'installation."; read -r; exit 1; }
fi

if [ ! -d app/dist ]; then
  echo "Préparation de l'interface…"
  npm run build || { echo "Échec du build."; read -r; exit 1; }
fi

if curl -s -o /dev/null "$URL"; then
  echo "L'Atelier tourne déjà — ouverture du navigateur…"
  open "$URL"
else
  echo "Démarrage de l'Atelier de Stories…"
  # Serveur détaché : survit à la fermeture de cette fenêtre.
  ATELIER_NO_OPEN=1 NODE_ENV=production nohup node server/index.js >/tmp/atelier-stories.log 2>&1 &
  disown
  # Attendre que le serveur réponde (max ~20 s), puis ouvrir le navigateur.
  for _ in $(seq 1 40); do
    curl -s -o /dev/null "$URL" && break
    sleep 0.5
  done
  open "$URL"
fi

# Referme cette fenêtre Terminal (le serveur continue en arrière-plan).
osascript -e 'tell application "Terminal" to close (first window whose frontmost is true)' >/dev/null 2>&1 &
