# Google Maps Worker

Python-Worker für KI-gestützte Kundensuche über Google Maps Places API.

## 🚀 Setup

### 1. Python-Environment erstellen

```bash
cd workers/google-maps-worker
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# oder
venv\Scripts\activate  # Windows
```

### 2. Dependencies installieren

```bash
pip install -r requirements.txt
```

### 3. Environment Variables konfigurieren

Kopieren Sie `.env.example` zu `.env` und setzen Sie die Variablen:

```bash
GOOGLE_MAPS_API_KEY=AIzaSy...
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=geruestbau_erp
```

## 📝 Verwendung

### Manuell einen Job ausführen

```bash
python worker.py <job_id>
```

Beispiel:
```bash
python worker.py 507f1f77bcf86cd799439011
```

### Als Service (optional)

Für automatische Job-Verarbeitung kann der Worker als Service laufen:

```bash
# Mit systemd (Linux)
sudo cp worker.service /etc/systemd/system/
sudo systemctl enable worker
sudo systemctl start worker
```

## 🔧 Integration mit Next.js API

Der Worker wird von der Next.js API getriggert:

```typescript
// app/api/customer-import/jobs/route.ts
import { spawn } from 'child_process'

// Job erstellen
const jobId = await createJob(params)

// Worker starten
spawn('python3', ['workers/google-maps-worker/worker.py', jobId], {
  detached: true,
  stdio: 'ignore'
})
```

## 📊 Workflow

1. **Job-Erstellung:** Next.js API erstellt Job in MongoDB
2. **Worker-Start:** API triggert Python-Worker
3. **Places-Suche:** Worker sucht via Google Maps API
4. **Detail-Abruf:** Worker holt Details für jeden Place
5. **Website-Analyse (optional):** Worker scrapt Kontaktdaten
6. **Speichern:** Ergebnisse werden in MongoDB gespeichert
7. **Abschluss:** Job-Status wird auf 'completed' gesetzt

## 🛠️ Entwicklung

### Tests

```bash
pytest tests/
```

### Linting

```bash
pylint worker.py
```

### Debugging

Setzen Sie Log-Level auf DEBUG:

```python
logging.basicConfig(level=logging.DEBUG)
```

## 📖 API-Referenz

### Google Maps Places API

- **Text Search:** https://places.googleapis.com/v1/places:searchText
- **Place Details:** https://places.googleapis.com/v1/places/{place_id}

### Felder (FieldMask)

```
places.id
places.displayName
places.formattedAddress
places.nationalPhoneNumber
places.websiteUri
places.types
places.addressComponents
```

## 💰 Kosten

- **Text Search:** $32 / 1000 Anfragen
- **Place Details:** $17 / 1000 Anfragen
- **Gratis-Kontingent:** $200/Monat

## 🔒 Sicherheit

- Niemals API-Keys committen
- Nutzen Sie `.env`-Dateien
- Beschränken Sie API-Keys in Google Cloud Console

## 🐛 Troubleshooting

### Fehler: "ModuleNotFoundError: No module named 'pymongo'"

```bash
pip install -r requirements.txt
```

### Fehler: "API key not valid"

- Überprüfen Sie `GOOGLE_MAPS_API_KEY` in `.env`
- Stellen Sie sicher, dass Places API aktiviert ist

### Fehler: "Connection refused (MongoDB)"

- Starten Sie MongoDB: `mongod`
- Überprüfen Sie `MONGODB_URI`

## 📚 Weitere Informationen

- [Google Maps Platform Docs](https://developers.google.com/maps/documentation)
- [PyMongo Documentation](https://pymongo.readthedocs.io/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

