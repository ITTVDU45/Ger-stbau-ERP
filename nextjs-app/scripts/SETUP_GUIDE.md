# Setup Guide für MongoDB und MinIO

## 🔍 Aktueller Status

Basierend auf den Test-Ergebnissen:

### MongoDB
- ❌ **Status**: Nicht verbunden
- **Problem**: `ECONNREFUSED` - MongoDB läuft nicht lokal
- **Konfiguration**: `mongodb://localhost:27017`

### MinIO
- ⚠️ **Status**: Verbindung funktioniert, aber Credentials falsch
- **Problem**: "The Access Key Id you provided does not exist in our records"
- **Konfiguration**: 
  - Endpoint: `minio-server-m1e0.onrender.com:443`
  - SSL: ✅ Aktiviert
  - Access Key: `minioadmin` (funktioniert nicht)

---

## 📋 Nächste Schritte

### Option 1: Lokale Services (Empfohlen für Entwicklung)

#### 1. MongoDB lokal starten

**Mit Docker (Einfachste Methode):**
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=gutachterportal \
  -v mongodb_data:/data/db \
  mongo:latest
```

**Oder mit Docker Compose:**
Erstelle `docker-compose.yml` im Projektroot:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: gutachter-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: gutachterportal
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  minio:
    image: quay.io/minio/minio
    container_name: gutachter-minio
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    restart: unless-stopped

volumes:
  mongodb_data:
  minio_data:
```

Dann starten:
```bash
docker-compose up -d
```

#### 2. .env für lokale Services anpassen

```env
# MongoDB (Lokal)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=gutachterportal

# MinIO (Lokal)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=gutachter-documents
```

#### 3. Tests erneut ausführen
```bash
npm run test:services
```

---

### Option 2: Remote Services nutzen (Deine aktuelle Config)

Du verwendest bereits einen Remote-MinIO-Server auf Render.

#### Für MinIO:
1. **Korrekte Credentials besorgen**
   - Logge dich in dein Render-Dashboard ein
   - Finde deinen MinIO Service
   - Kopiere die echten Access Key und Secret Key
   
2. **Aktualisiere .env**
```env
MINIO_ENDPOINT=https://minio-server-m1e0.onrender.com
MINIO_PORT=443
MINIO_ACCESS_KEY=[DEIN_ECHTER_ACCESS_KEY]
MINIO_SECRET_KEY=[DEIN_ECHTER_SECRET_KEY]
MINIO_USE_SSL=true
MINIO_BUCKET=gutachter
```

#### Für MongoDB:
Du hast zwei Optionen:

**A) MongoDB Atlas (Cloud, kostenlos):**
1. Gehe zu https://www.mongodb.com/cloud/atlas
2. Erstelle einen kostenlosen Cluster
3. Hole die Connection String
4. Aktualisiere .env:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=gutachterportal
```

**B) MongoDB auf Render:**
1. Erstelle einen neuen MongoDB Service auf Render
2. Kopiere die Connection String
3. Aktualisiere .env entsprechend

---

## ✅ Verifizierung

Nach dem Setup, teste mit:

```bash
# Alle Services testen
npm run test:services

# Oder einzeln:
npm run test:mongodb
npm run test:minio
```

**Erwartetes Ergebnis:**
```
============================================================
📊 Test Summary
============================================================
MongoDB: ✅ PASSED
MinIO: ✅ PASSED
============================================================

🎉 All tests passed!
Your environment is ready to go!
```

---

## 🔧 Troubleshooting

### MongoDB

**Problem**: `ECONNREFUSED`
- ✅ Prüfe ob MongoDB läuft: `docker ps` oder `mongosh`
- ✅ Prüfe Port 27017: `lsof -i :27017`
- ✅ Bei Docker: `docker logs mongodb`

**Problem**: "Authentication failed"
- ✅ Prüfe Username/Password in Connection String
- ✅ Bei Atlas: Whitelist deine IP-Adresse

### MinIO

**Problem**: "Access Key Id does not exist"
- ✅ Hole die echten Credentials aus Render
- ✅ Bei lokalem MinIO: Standard ist `minioadmin/minioadmin`
- ✅ Prüfe MinIO Console: http://localhost:9001

**Problem**: "Invalid endPoint"
- ✅ Entferne `https://` aus MINIO_ENDPOINT (wird automatisch geparst)
- ✅ Oder nutze nur den Hostname

---

## 📦 Empfohlene Entwicklungs-Setup

Für lokale Entwicklung empfehle ich:

1. **Lokale Services mit Docker Compose** (siehe oben)
2. **Vorteile:**
   - ✅ Schnell und offline verfügbar
   - ✅ Keine Cloud-Kosten während Entwicklung
   - ✅ Volle Kontrolle über Daten
   - ✅ Einfach zurücksetzen bei Problemen

3. **Production:**
   - MongoDB Atlas (kostenlos bis 512MB)
   - MinIO auf Render oder AWS S3

---

## 🚀 Quick Start (Komplettlösung)

```bash
# 1. Docker Compose Datei erstellen (siehe oben)

# 2. Services starten
docker-compose up -d

# 3. Warten bis Services bereit sind (10-20 Sekunden)
sleep 15

# 4. Tests ausführen
npm run test:services

# 5. Bei Erfolg: Next.js starten
npm run dev
```

---

## 📞 Support

Falls Tests weiterhin fehlschlagen:

1. Zeige mir die Ausgabe von:
   ```bash
   docker ps
   cat .env | grep -E "MONGO|MINIO"
   ```

2. Oder die vollständige Fehlerausgabe der Tests

