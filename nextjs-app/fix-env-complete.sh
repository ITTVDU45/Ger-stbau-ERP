#!/bin/bash
set -e

echo "🔄 Bereinige und aktualisiere Vercel Environment-Variablen..."
echo ""

# Funktion zum Löschen und Neusetzen einer Variable
update_var() {
  local KEY="$1"
  local VALUE="$2"
  
  echo "📝 Aktualisiere $KEY..."
  
  # Versuche zu löschen (alle Environments)
  echo "   Lösche alte Werte..."
  { echo "y"; echo "y"; echo "y"; } | vercel env rm "$KEY" 2>&1 | grep -E "(Removed|Error|success)" | head -3 || true
  
  sleep 1
  
  # Füge neuen Wert für Production hinzu
  echo "   Füge neuen Wert hinzu..."
  printf "%s" "$VALUE" | vercel env add "$KEY" production 2>&1 | grep -E "(Added|Error|success)" | head -3 || true
  
  sleep 1
  echo ""
}

# Aktualisiere die 4 kritischen Variablen
update_var "MONGODB_DB" "geruestbau_erp"
update_var "MINIO_BUCKET" "gerustbau"
update_var "MONGO_URI" "mongodb://GeruestbauAPLUS_db_user:spUVToPfcNNrGaEb@ac-o0nij6p-shard-00-01.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-02.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-00.0vn5roj.mongodb.net:27017/geruestbau_erp?ssl=true&authSource=admin&retryWrites=true&w=majority"
update_var "MONGODB_URI" "mongodb://GeruestbauAPLUS_db_user:spUVToPfcNNrGaEb@ac-o0nij6p-shard-00-01.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-02.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-00.0vn5roj.mongodb.net:27017/geruestbau_erp?ssl=true&authSource=admin&retryWrites=true&w=majority"

echo "✅ Environment-Variablen aktualisiert!"
echo "⏭️  Starte jetzt Production Deployment..."
