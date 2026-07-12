#!/bin/bash
# Double-clic pour ENVOYER tes créations vers le dossier partagé
# (et récupérer au passage celles faites sur l'autre Mac).
cd "$(dirname "$0")" || exit 1

if [ ! -d .git ]; then
  echo "Ce dossier n'est pas relié au dossier partagé."
  read -r
  exit 1
fi

echo "1/3 · Enregistrement de tes créations…"
git add -A
if git diff --cached --quiet; then
  echo "     (rien de nouveau à enregistrer)"
else
  git commit -m "Créations — $(scutil --get ComputerName 2>/dev/null || echo Mac), $(date '+%d/%m/%Y %H:%M')" >/dev/null
fi

echo "2/3 · Récupération des nouveautés…"
git pull --rebase --autostash 2>/dev/null || git rebase --abort 2>/dev/null

echo "3/3 · Envoi vers le dossier partagé…"
if git push 2>&1; then
  echo ""
  echo "✅ Synchronisation terminée. Tu peux fermer cette fenêtre."
else
  echo ""
  echo "⚠️  L'envoi a échoué — il faut se connecter à GitHub une première fois."
  echo "    Garde ce message et demande de l'aide pour la configuration initiale."
fi
echo ""
echo "(Appuie sur Entrée pour fermer.)"
read -r
