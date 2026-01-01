#!/bin/bash

echo "🔄 Aktualisiere verbleibende 3 ENV-Variablen..."
echo ""

fix_mongo_var() {
  local KEY="$1"
  local VALUE="$2"
  
  echo "📝 Bearbeite $KEY..."
  
  # Lösche aus Development
  echo "   → Development..."
  printf "Development\ny\n" | vercel env rm "$KEY" 2>&1 | grep -i "removed\|error" | head -1 || true
  
  # Lösche aus Preview
  echo "   → Preview..."
  printf "Preview\ny\n" | vercel env rm "$KEY" 2>&1 | grep -i "removed\|error" | head -1 || true
  
  # Lösche aus Production
  echo "   → Production..."
  printf "Production\ny\n" | vercel env rm "$KEY" 2>&1 | grep -i "removed\|error" | head -1 || true
  
  sleep 2
  
  # Füge für Production neu hinzu
  echo "   ✅ Füge neu für Production hinzu..."
  printf "%s" "$VALUE" | vercel env add "$KEY" production 2>&1 | grep -i "added\|error" | head -1 || true
  
  echo ""
  sleep 1
}

# Mongo Connection String
MONGO_CONN="mongodb://GeruestbauAPLUS_db_user:spUVToPfcNNrGaEb@ac-o0nij6p-shard-00-01.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-02.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-00.0vn5roj.mongodb.net:27017/geruestbau_erp?ssl=true&authSource=admin&retryWrites=true&w=majority"

fix_mongo_var "MONGODB_DB" "geruestbau_erp"
fix_mongo_var "MONGO_URI" "$MONGO_CONN"
fix_mongo_var "MONGODB_URI" "$MONGO_CONN"

echo "✅ Alle Variablen aktualisiert!"
