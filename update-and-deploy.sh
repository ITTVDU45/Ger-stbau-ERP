#!/bin/bash

# Gerüstbau ERP - Update & Deploy Script
# Behebt Login-Redirect und Favicon-Problem

set -e

echo "🔧 Gerüstbau ERP - Update & Deploy"
echo "===================================="
echo ""

cd "$(dirname "$0")"

echo "📝 Schritt 1: Git Commit..."
echo ""

git add -A
git commit -m "fix: Login-Redirect und Favicon beheben

🔧 Login-Fix:
- window.location.href statt router.push() für vollständigen Reload
- 500ms Delay damit Cookie gesetzt wird
- Verhindert Redirect-Loop nach erfolgreichem Login

✨ Favicon hinzugefügt:
- favicon.ico und icon.svg erstellt
- Behebt 404-Fehler für Favicon

🚀 Bereit für Production"

echo "✅ Commit erfolgreich!"
echo ""
echo "📤 Schritt 2: Git Push..."
echo ""

git push origin main

echo "✅ Push erfolgreich!"
echo ""
echo "🚀 Schritt 3: Vercel Deployment..."
echo ""

cd nextjs-app
vercel --prod --yes

echo ""
echo "🎉 Update erfolgreich deployed!"
echo ""
echo "✅ Behobene Probleme:"
echo "   • Login-Redirect funktioniert jetzt"
echo "   • Favicon 404-Fehler behoben"
echo "   • Cookie-Handling verbessert"
echo ""
echo "🔗 Bitte testen Sie: https://nextjs-app-ten-omega.vercel.app/login"
echo ""

