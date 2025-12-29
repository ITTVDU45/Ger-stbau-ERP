#!/bin/bash

# Setze die Produktions-URL auf Vercel
echo "📝 Setze NEXT_PUBLIC_APP_URL auf Vercel..."

# Setze für Production
echo "https://nextjs-app-ten-omega.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production

# Setze auch für Preview (optional)
echo "https://nextjs-app-ten-omega.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL preview

echo "✅ Umgebungsvariablen gesetzt!"
echo "🚀 Deploye jetzt neu, damit die Änderungen wirksam werden..."

