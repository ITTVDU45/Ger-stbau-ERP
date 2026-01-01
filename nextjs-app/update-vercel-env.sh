#!/bin/bash
echo "🔄 Aktualisiere kritische Vercel Environment-Variablen..."

# Funktion zum Setzen einer Variable
set_env_var() {
  local key="$1"
  local value="$2"
  echo "  📝 Setze $key..."
  printf "%s" "$value" | vercel env add "$key" production --force 2>&1 | head -5 || true
  sleep 1
}

# Kritische Variablen setzen
set_env_var "MONGODB_DB" "geruestbau_erp"
set_env_var "MONGODB_URI" "mongodb://GeruestbauAPLUS_db_user:spUVToPfcNNrGaEb@ac-o0nij6p-shard-00-01.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-02.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-00.0vn5roj.mongodb.net:27017/geruestbau_erp?ssl=true&authSource=admin&retryWrites=true&w=majority"
set_env_var "MONGO_URI" "mongodb://GeruestbauAPLUS_db_user:spUVToPfcNNrGaEb@ac-o0nij6p-shard-00-01.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-02.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-00.0vn5roj.mongodb.net:27017/geruestbau_erp?ssl=true&authSource=admin&retryWrites=true&w=majority"
set_env_var "MINIO_BUCKET" "gerustbau"

echo "✅ Kritische Variablen aktualisiert!"
