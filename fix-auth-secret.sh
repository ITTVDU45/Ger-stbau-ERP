#!/bin/bash

# Fix AUTH_SECRET auf Vercel
# Das AUTH_SECRET MUSS auf Vercel das gleiche sein wie in .env

set -e

echo "🔐 AUTH_SECRET auf Vercel aktualisieren"
echo "========================================"
echo ""

cd "$(dirname "$0")/nextjs-app"

# Lese AUTH_SECRET aus .env
AUTH_SECRET=$(grep '^AUTH_SECRET=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$AUTH_SECRET" ]; then
    echo "❌ Fehler: AUTH_SECRET nicht in .env gefunden!"
    exit 1
fi

echo "✅ AUTH_SECRET gefunden: ${AUTH_SECRET:0:10}... (gekürzt)"
echo ""
echo "📤 Setze AUTH_SECRET auf Vercel..."
echo ""

# Entferne alte AUTH_SECRET (falls vorhanden)
echo "y" | vercel env rm AUTH_SECRET production 2>/dev/null || true
echo "y" | vercel env rm AUTH_SECRET preview 2>/dev/null || true
echo "y" | vercel env rm AUTH_SECRET development 2>/dev/null || true

# Setze neue AUTH_SECRET
echo "$AUTH_SECRET" | vercel env add AUTH_SECRET production
echo "$AUTH_SECRET" | vercel env add AUTH_SECRET preview
echo "$AUTH_SECRET" | vercel env add AUTH_SECRET development

echo ""
echo "✅ AUTH_SECRET erfolgreich auf Vercel gesetzt!"
echo ""
echo "🚀 Deploye jetzt neu..."
echo ""

vercel --prod --yes

echo ""
echo "🎉 Fertig! Testen Sie jetzt den Login erneut."
echo ""

