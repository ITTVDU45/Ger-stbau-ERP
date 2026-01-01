#!/bin/bash
# Diese Datei enthält alle Befehle zum Erstellen der Dateien direkt auf dem Server
# Führen Sie diese Befehle EINZELN auf dem Server aus!

echo "════════════════════════════════════════════════════════════"
echo "📝 ALLE DATEIEN DIREKT AUF SERVER ERSTELLEN"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Kopieren Sie jeden Block EINZELN in Ihr Server-Terminal!"
echo ""

# ============================================================
# BLOCK 1: Verzeichnis vorbereiten
# ============================================================
echo "# BLOCK 1: Verzeichnis vorbereiten"
cat << 'EOF1'
cd /opt/customer-import-worker
pwd
ls -la
EOF1

# ============================================================
# BLOCK 2: requirements.txt
# ============================================================
echo ""
echo "# BLOCK 2: requirements.txt erstellen"
cat << 'EOF2'
cat > requirements.txt << 'REQEOF'
# MongoDB
pymongo==4.6.1

# HTTP Requests
requests==2.31.0

# Environment Variables
python-dotenv==1.0.0

# Web Scraping
beautifulsoup4==4.12.3
lxml==5.1.0

# FastAPI & API Server
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
REQEOF

echo "✅ requirements.txt erstellt"
EOF2

# ============================================================
# BLOCK 3: Dockerfile
# ============================================================
echo ""
echo "# BLOCK 3: Dockerfile erstellen"
cat << 'EOF3'
cat > Dockerfile << 'DOCKEOF'
FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

EXPOSE 8000

CMD ["python", "api.py"]
DOCKEOF

echo "✅ Dockerfile erstellt"
EOF3

# ============================================================
# BLOCK 4: docker-compose.yml
# ============================================================
echo ""
echo "# BLOCK 4: docker-compose.yml erstellen"
cat << 'EOF4'
cat > docker-compose.yml << 'COMPEOF'
version: '3.8'

services:
  worker-api:
    build: .
    container_name: customer-import-worker
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - MONGODB_DB=${MONGODB_DB:-geruestbau_erp}
      - GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}
      - PORT=8000
      - ENVIRONMENT=production
      - PYTHONUNBUFFERED=1
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
COMPEOF

echo "✅ docker-compose.yml erstellt"
EOF4

# ============================================================
# BLOCK 5: .dockerignore
# ============================================================
echo ""
echo "# BLOCK 5: .dockerignore erstellen"
cat << 'EOF5'
cat > .dockerignore << 'IGNEOF'
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
Thumbs.db
.git/
.gitignore
*.log
README.md
*.md
start-worker.sh
IGNEOF

echo "✅ .dockerignore erstellt"
EOF5

# ============================================================
# BLOCK 6: .env
# ============================================================
echo ""
echo "# BLOCK 6: .env Datei erstellen"
cat << 'EOF6'
cat > .env << 'ENVEOF'
MONGODB_URI=mongodb://GeruestbauAPLUS_db_user:spUVToPfcNNrGaEb@ac-o0nij6p-shard-00-01.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-02.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-00.0vn5roj.mongodb.net:27017/geruestbau_erp?ssl=true&authSource=admin&retryWrites=true&w=majority
MONGODB_DB=geruestbau_erp
GOOGLE_MAPS_API_KEY=AIzaSyA_1c2x50fbRkDFoOblzZS1vWMhxfB7hRQ
PORT=8000
ENVIRONMENT=production
ENVEOF

chmod 600 .env
echo "✅ .env erstellt"
EOF6

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Alle Blöcke kopieren und ausführen!"
echo "════════════════════════════════════════════════════════════"

