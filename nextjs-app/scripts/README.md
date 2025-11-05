# Service Test Scripts

Diese Scripts testen die Verbindungen zu externen Services (MongoDB und MinIO).

## Setup

### 1. Erstelle eine `.env` Datei

Kopiere `.env.example` zu `.env` und fülle die Werte aus:

```bash
cp .env.example .env
```

Beispiel `.env`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=gutachterportal

# MinIO / S3
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=gutachter-documents
```

### 2. Starte MongoDB (lokal)

```bash
# Mit Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Oder mit MongoDB installiert:
mongod
```

### 3. Starte MinIO (lokal)

```bash
# Mit Docker:
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  quay.io/minio/minio server /data --console-address ":9001"

# MinIO Console: http://localhost:9001
# MinIO API: http://localhost:9000
```

## Tests ausführen

### Alle Services testen

```bash
npm run test:services
```

### Nur MongoDB testen

```bash
npm run test:mongodb
```

### Nur MinIO testen

```bash
npm run test:minio
```

## Was wird getestet?

### MongoDB Test
- ✅ Verbindung zur Datenbank
- ✅ Zugriff auf die konfigurierte Datenbank
- ✅ Collections auflisten
- ✅ Schreib-/Lese-Operationen
- ✅ Server-Version

### MinIO Test
- ✅ Verbindung zum MinIO Server
- ✅ Buckets auflisten
- ✅ Bucket erstellen (falls nicht vorhanden)
- ✅ Datei hochladen
- ✅ Datei herunterladen
- ✅ Datei-Metadaten abrufen
- ✅ Objekte auflisten
- ✅ Datei löschen

## Troubleshooting

### MongoDB verbindet nicht

1. Prüfe ob MongoDB läuft: `mongosh` oder `mongo`
2. Prüfe den Port: Standard ist 27017
3. Prüfe die Firewall-Einstellungen
4. Bei Docker: `docker ps` um zu sehen ob der Container läuft

### MinIO verbindet nicht

1. Prüfe ob MinIO läuft: Öffne http://localhost:9001 im Browser
2. Prüfe die Credentials (Standard: minioadmin/minioadmin)
3. Prüfe den Port: Standard ist 9000 (API) und 9001 (Console)
4. Bei Docker: `docker logs minio` für Fehlerlog

### "Module not found" Fehler

```bash
npm install
```

## Docker Compose (empfohlen)

Erstelle eine `docker-compose.yml` im Projektroot:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: gutachterportal
    volumes:
      - mongodb_data:/data/db

  minio:
    image: quay.io/minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  mongodb_data:
  minio_data:
```

Starten:
```bash
docker-compose up -d
```

Stoppen:
```bash
docker-compose down
```

