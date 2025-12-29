#!/bin/bash

# Gerüstbau ERP - Automatisches Vercel Deployment Script
# Dieses Skript lädt alle Environment Variables hoch und deployt die App

set -e

echo "🚀 Gerüstbau ERP - Vercel Deployment"
echo "======================================"

# Wechsle ins nextjs-app Verzeichnis
cd "$(dirname "$0")/nextjs-app"

echo ""
echo "📋 Schritt 1: Environment Variables hochladen..."
echo ""

# Lese .env und lade jede Variable zu Vercel hoch
while IFS= read -r line; do
  # Überspringe Kommentare und leere Zeilen
  [[ "$line" =~ ^#.*$ ]] && continue
  [[ -z "$line" ]] && continue
  
  # Extrahiere Variablenname und Wert
  if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
    VAR_NAME="${BASH_REMATCH[1]}"
    VAR_VALUE="${BASH_REMATCH[2]}"
    
    # Entferne Anführungszeichen falls vorhanden
    VAR_VALUE="${VAR_VALUE%\"}"
    VAR_VALUE="${VAR_VALUE#\"}"
    VAR_VALUE="${VAR_VALUE%\'}"
    VAR_VALUE="${VAR_VALUE#\'}"
    
    echo "  ➜ Setze $VAR_NAME..."
    
    # Setze die Variable für production, preview und development
    echo "$VAR_VALUE" | vercel env add "$VAR_NAME" production --yes 2>/dev/null || true
    echo "$VAR_VALUE" | vercel env add "$VAR_NAME" preview --yes 2>/dev/null || true
    echo "$VAR_VALUE" | vercel env add "$VAR_NAME" development --yes 2>/dev/null || true
  fi
done < .env

echo ""
echo "✅ Environment Variables erfolgreich hochgeladen!"
echo ""
echo "📦 Schritt 2: Production Build & Deployment..."
echo ""

# Deployment starten
vercel --prod --yes

echo ""
echo "🎉 Deployment erfolgreich abgeschlossen!"
echo ""
echo "📝 Nächste Schritte:"
echo "   1. Öffnen Sie die Vercel URL (siehe oben)"
echo "   2. Fügen Sie die Production-Domain hinzu falls gewünscht"
echo "   3. Testen Sie die Anwendung"
echo ""

