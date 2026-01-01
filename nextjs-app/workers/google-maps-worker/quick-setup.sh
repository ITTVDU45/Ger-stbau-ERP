#!/bin/bash
# Quick Setup Script für Customer Import Worker
# Auf dem Server ausführen!

set -e

echo "=========================================="
echo "🚀 Customer Import Worker Setup"
echo "=========================================="

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Docker Check
echo ""
echo "1️⃣  Prüfe Docker Installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker nicht gefunden. Installiere Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker installiert${NC}"
else
    echo -e "${GREEN}✅ Docker bereits installiert${NC}"
fi

# 2. Docker Compose Check
echo ""
echo "2️⃣  Prüfe Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Docker Compose nicht gefunden. Installiere...${NC}"
    sudo apt-get update
    sudo apt-get install docker-compose-plugin -y
    echo -e "${GREEN}✅ Docker Compose installiert${NC}"
else
    echo -e "${GREEN}✅ Docker Compose bereits installiert${NC}"
fi

# 3. Arbeitsverzeichnis
echo ""
echo "3️⃣  Erstelle Arbeitsverzeichnis..."
if [ ! -d "/opt/customer-import-worker" ]; then
    sudo mkdir -p /opt/customer-import-worker
    sudo chown $USER:$USER /opt/customer-import-worker
    echo -e "${GREEN}✅ Verzeichnis erstellt${NC}"
else
    echo -e "${GREEN}✅ Verzeichnis existiert bereits${NC}"
fi

# 4. .env Check
echo ""
echo "4️⃣  Prüfe .env Datei..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env nicht gefunden!${NC}"
    echo ""
    echo "Erstelle .env Template..."
    cat > .env << 'EOF'
# MongoDB Connection (WICHTIG: Aus Vercel übernehmen!)
MONGODB_URI=mongodb://GeruestbauAPLUS_db_user:spUVToPfcNNrGaEb@ac-o0nij6p-shard-00-01.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-02.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-00.0vn5roj.mongodb.net:27017/geruestbau_erp?ssl=true&authSource=admin&retryWrites=true&w=majority
MONGODB_DB=geruestbau_erp

# Google Maps API Key
GOOGLE_MAPS_API_KEY=AIzaSyA_1c2x50fbRkDFoOblzZS1vWMhxfB7hRQ

# Server Config
PORT=8000
ENVIRONMENT=production
EOF
    chmod 600 .env
    echo -e "${GREEN}✅ .env Template erstellt${NC}"
    echo -e "${YELLOW}ℹ️  Bitte .env anpassen falls nötig: nano .env${NC}"
else
    echo -e "${GREEN}✅ .env existiert bereits${NC}"
fi

# 5. Docker Build & Start
echo ""
echo "5️⃣  Starte Docker Container..."
docker-compose up -d --build

echo ""
echo "Warte 5 Sekunden..."
sleep 5

# 6. Status Check
echo ""
echo "6️⃣  Prüfe Container Status..."
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Container läuft!${NC}"
else
    echo -e "${RED}❌ Container läuft nicht!${NC}"
    echo "Logs:"
    docker-compose logs --tail=50
    exit 1
fi

# 7. Health Check
echo ""
echo "7️⃣  Health Check..."
sleep 2
HEALTH_RESPONSE=$(curl -s http://localhost:8000/health)

if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ Health Check erfolgreich!${NC}"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo -e "${YELLOW}⚠️  Health Check fehlgeschlagen${NC}"
    echo "Response: $HEALTH_RESPONSE"
fi

# 8. Fertig!
echo ""
echo "=========================================="
echo -e "${GREEN}✅ SETUP ABGESCHLOSSEN!${NC}"
echo "=========================================="
echo ""
echo "📍 Worker läuft auf: http://localhost:8000"
echo ""
echo "🔍 Nützliche Befehle:"
echo "  • Logs anschauen:    docker-compose logs -f"
echo "  • Status prüfen:     docker-compose ps"
echo "  • Container stoppen: docker-compose down"
echo "  • Container starten: docker-compose up -d"
echo "  • Health Check:      curl http://localhost:8000/health"
echo ""
echo "🌐 Öffentlich erreichbar machen:"
echo "  1. Firewall: sudo ufw allow 8000/tcp"
echo "  2. Oder Nginx Reverse Proxy (siehe DEPLOY.md)"
echo ""
echo "🎯 Nächster Schritt:"
echo "  → Vercel ENV setzen: WORKER_API_URL=http://YOUR-SERVER-IP:8000"
echo "  → Vercel redeploy:   vercel deploy --prod --yes"
echo ""
echo "=========================================="

