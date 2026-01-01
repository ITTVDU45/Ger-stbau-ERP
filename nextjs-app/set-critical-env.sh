#!/bin/bash
set -e

echo "🔄 Setze kritische Environment-Variablen für Vercel Production..."
echo ""

# MONGODB_DB
echo "1/4: MONGODB_DB..."
printf "geruestbau_erp" | vercel env add MONGODB_DB production <<< "" 2>&1 | tail -3 || echo "   → Existiert bereits oder Fehler"

# MINIO_BUCKET  
echo "2/4: MINIO_BUCKET..."
printf "gerustbau" | vercel env add MINIO_BUCKET production <<< "" 2>&1 | tail -3 || echo "   → Existiert bereits oder Fehler"

# MONGO_URI
echo "3/4: MONGO_URI..."
printf "mongodb://GeruestbauAPLUS_db_user:spUVToPfcNNrGaEb@ac-o0nij6p-shard-00-01.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-02.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-00.0vn5roj.mongodb.net:27017/geruestbau_erp?ssl=true&authSource=admin&retryWrites=true&w=majority" | vercel env add MONGO_URI production <<< "" 2>&1 | tail -3 || echo "   → Existiert bereits oder Fehler"

# MONGODB_URI
echo "4/4: MONGODB_URI..."
printf "mongodb://GeruestbauAPLUS_db_user:spUVToPfcNNrGaEb@ac-o0nij6p-shard-00-01.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-02.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-00.0vn5roj.mongodb.net:27017/geruestbau_erp?ssl=true&authSource=admin&retryWrites=true&w=majority" | vercel env add MONGODB_URI production <<< "" 2>&1 | tail -3 || echo "   → Existiert bereits oder Fehler"

echo ""
echo "✅ Variablen gesetzt! Starte jetzt Deployment..."
