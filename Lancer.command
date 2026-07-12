#!/bin/bash
# Double-clic pour lancer l'Atelier de Stories.
# - Récupère automatiquement les dernières nouveautés (git pull) au démarrage.
# - Démarre le serveur en arrière-plan, ouvre le navigateur, puis referme cette fenêtre.
# - Relançable à tout moment sans fermer le Terminal.
cd "$(dirname "$0")" || exit 1

URL="http://localhost:4321"

# Mémorise CETTE fenêtre Terminal pour la refermer précisément à la fin,
# même après que le navigateur a pris le focus (macOS demandera une autorisation la 1re fois).
WINID="$(osascript -e 'tell application "Terminal" to id of front window' 2>/dev/null)"

# 1) Synchronisation automatique (sans bloquer si hors-ligne ou en cas de conflit).
UPDATED=0
if [ -d .git ]; then
  echo "Synchronisation des dernières nouveautés…"
  BEFORE="$(git rev-parse HEAD 2>/dev/null)"
  git pull --rebase --autostash 2>/dev/null || git rebase --abort 2>/dev/null
  AFTER="$(git rev-parse HEAD 2>/dev/null)"
  [ "$BEFORE" != "$AFTER" ] && UPDATED=1
fi

# 2) Dépendances (première fois uniquement).
if [ ! -d node_modules ]; then
  echo "Première installation, patiente…"
  npm install || { echo "Échec de l'installation."; read -r; exit 1; }
fi

# 3) Construction de l'interface (si absente ou si une mise à jour a été récupérée).
if [ ! -d app/dist ] || [ "$UPDATED" = "1" ]; then
  echo "Préparation de l'interface…"
  npm run build || { echo "Échec du build."; read -r; exit 1; }
fi

# 4) (Re)lancement. Si une mise à jour a été récupérée, on redémarre le serveur.
if [ "$UPDATED" = "1" ]; then
  echo "Mise à jour récupérée — redémarrage…"
  pkill -f "server/index.js" 2>/dev/null
  sleep 1
fi
if curl -s -o /dev/null "$URL"; then
  echo "L'Atelier tourne déjà — ouverture du navigateur…"
  open "$URL"
else
  echo "Démarrage de l'Atelier de Stories…"
  # Serveur détaché : survit à la fermeture de cette fenêtre.
  ATELIER_NO_OPEN=1 NODE_ENV=production nohup node server/index.js >/tmp/atelier-stories.log 2>&1 &
  disown
  for _ in $(seq 1 40); do
    curl -s -o /dev/null "$URL" && break
    sleep 0.5
  done
  open "$URL"
fi

# 4b) Envoi automatique des créations/fonds vers le dépôt partagé (best-effort, non bloquant).
#     Nécessite une connexion GitHub acceptée une première fois (via Sync.command).
if [ -d .git ]; then
  sleep 2   # laisse le serveur importer les nouveaux fonds dans la banque
  git add -A 2>/dev/null
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -m "Sync auto — $(scutil --get ComputerName 2>/dev/null || echo Mac), $(date '+%d/%m/%Y %H:%M')" >/dev/null 2>&1
  fi
  git pull --rebase --autostash 2>/dev/null || git rebase --abort 2>/dev/null
  git push >/dev/null 2>&1 &
fi

# 5) Referme cette fenêtre Terminal (le serveur continue en arrière-plan).
if [ -n "$WINID" ]; then
  osascript -e "tell application \"Terminal\" to close (every window whose id is $WINID)" >/dev/null 2>&1 &
else
  osascript -e 'tell application "Terminal" to close (first window whose frontmost is true)' >/dev/null 2>&1 &
fi
