# Gerüstbau ERP Software

Moderne ERP-Lösung für Gerüstbau-Unternehmen, entwickelt mit Next.js 15, React 19 und TypeScript.

## 📋 Übersicht

Diese ERP-Software bietet eine umfassende Lösung für die Verwaltung von:
- **Mitarbeitern**: Stammdaten, Qualifikationen, Zeiterfassung
- **Projekten**: Bauvorhaben, Baustellen, Fortschrittsverfolgung
- **Angeboten & Rechnungen**: Kalkulation, PDF-Generierung, Versand
- **Kalender**: Einsatzplanung, Terminverwaltung
- **Finanzen**: Buchhaltung, DATEV-Export, Statistiken

## 🚀 Quick Start

### Voraussetzungen

- Node.js 20+ 
- MongoDB 6+
- MinIO (für Dokumentenspeicherung)
- npm oder yarn

### Installation

1. **Repository klonen**
```bash
cd "Gerüstbau ERP Software/nextjs-app"
```

2. **Dependencies installieren**
```bash
npm install
```

3. **Environment-Variablen konfigurieren**
```bash
# Kopieren Sie env.example.txt zu .env.local
cp ../env.example.txt .env.local

# Bearbeiten Sie .env.local mit Ihren Werten
```

4. **MongoDB & MinIO starten**
```bash
# MongoDB (lokal oder Docker)
mongod --dbpath ./data/db

# MinIO (Docker)
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

5. **Entwicklungsserver starten**
```bash
npm run dev
```

6. **Öffnen Sie** [http://localhost:3000](http://localhost:3000)

## 📁 Projektstruktur

```
nextjs-app/
├── app/
│   ├── (marketing)/          # Landingpage (optional)
│   ├── api/                  # API-Routes
│   │   ├── mitarbeiter/
│   │   ├── zeiterfassung/
│   │   ├── projekte/
│   │   ├── angebote/
│   │   └── rechnungen/
│   └── dashboard/
│       └── admin/
│           ├── uebersicht/        # Haupt-Dashboard
│           ├── mitarbeiter/       # Mitarbeiter-Verwaltung
│           ├── zeiterfassung/     # Zeiterfassung & Freigabe
│           ├── einsatzplanung/    # Einsatz-Timeline
│           ├── urlaub/            # Urlaub & Abwesenheiten
│           ├── projekte/          # Projekt-Verwaltung
│           ├── angebote/          # Angebots-Erstellung
│           ├── rechnungen/        # Rechnungs-Management
│           ├── kalender/          # Kalender & Termine
│           ├── statistiken/       # Reports & Charts
│           ├── buchhaltung/       # DATEV-Export, Archiv
│           └── einstellungen/     # System-Einstellungen
├── components/
│   ├── ui/                   # ShadCN UI-Komponenten
│   └── app-sidebar.tsx       # Haupt-Navigation
├── lib/
│   ├── db/
│   │   ├── client.ts         # MongoDB-Verbindung
│   │   ├── types.ts          # TypeScript-Interfaces
│   │   └── services/         # Datenbank-Services
│   ├── utils/
│   │   ├── pdfGenerator.ts   # PDF-Erstellung (TODO)
│   │   ├── emailSender.ts    # E-Mail-Versand (TODO)
│   │   └── datevExporter.ts  # DATEV-Export (TODO)
│   └── storage/
│       └── minioClient.ts    # MinIO-Integration
└── public/                   # Statische Assets

```

## 🏗️ Architektur

### Tech-Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **UI-Framework**: ShadCN UI, Radix UI
- **Backend**: Next.js API-Routes (Node.js Runtime)
- **Datenbank**: MongoDB
- **Storage**: MinIO (S3-kompatibel)
- **Charts**: Recharts
- **Formulare**: React Hook Form + Zod (empfohlen)
- **Tabellen**: TanStack Table
- **Datumsformatierung**: date-fns

### Datenbank-Schema

Alle Typen sind in `lib/db/types.ts` definiert:

- **Mitarbeiter**: Stammdaten, Qualifikationen, Verfügbarkeiten
- **Zeiterfassung**: Arbeitsstunden mit Projekt-Zuordnung
- **Urlaub**: Urlaubsanträge mit Genehmigungsworkflow
- **Projekt**: Bauprojekte mit zugewiesenen Mitarbeitern
- **Kunde**: Firmendaten und Kontakte
- **Angebot**: Positionen, Kalkulation, Versionierung
- **Rechnung**: Rechnungserstellung aus Angeboten
- **Termin**: Kalendereinträge und Einsatzplanung
- **Material**: Stammdaten für Materialverwaltung

### API-Konventionen

Alle API-Routes folgen RESTful-Prinzipien:

```typescript
GET    /api/mitarbeiter        // Liste abrufen
POST   /api/mitarbeiter        // Neuen Eintrag erstellen
GET    /api/mitarbeiter/[id]   // Einzelnen Eintrag abrufen
PUT    /api/mitarbeiter/[id]   // Eintrag aktualisieren
DELETE /api/mitarbeiter/[id]   // Eintrag löschen
```

Response-Format:
```json
{
  "erfolg": true,
  "mitarbeiter": [...],
  "fehler": "Fehlermeldung (bei Fehler)"
}
```

## 🎨 Design-System

### Farben

Die Anwendung nutzt Tailwind CSS mit einer auf Gerüstbau abgestimmten Farbpalette:

- **Primär**: Blau (`blue-600`, `indigo-600`) - Projekte, Header
- **Erfolg**: Grün (`green-600`, `emerald-600`) - Zeiterfassung, Freigaben
- **Warnung**: Orange (`orange-600`, `amber-600`) - Urlaub, Warnungen
- **Fehler**: Rot (`red-600`) - Ablehnungen, Fehler
- **Neutral**: Grau (`gray-*`) - Text, Rahmen

### Komponenten-Styling

- **Cards**: Abgerundete Kanten (`rounded-lg`), dezente Schatten
- **Buttons**: Konsistente Höhen, klare Hover-States
- **Tabellen**: Zebra-Streifen, sortierbare Spalten
- **Formulare**: Inline-Validierung, klare Fehlermeldungen

## 📝 Änderungs-Checkliste

**Wenn Sie Komponenten, Props oder APIs ändern, beachten Sie:**

### 1. Props-Änderungen

Wenn Sie Props einer Komponente ändern:
- [ ] TypeScript-Interface anpassen
- [ ] Alle Verwendungen der Komponente suchen (mit `grep` oder IDE)
- [ ] Alle Aufrufe aktualisieren
- [ ] `tsc --noEmit` ausführen, um Fehler zu finden

### 2. Datenbank-Schema-Änderungen

Wenn Sie ein Interface in `lib/db/types.ts` ändern:
- [ ] Alle API-Routes prüfen, die diesen Typ verwenden
- [ ] Formular-Komponenten anpassen
- [ ] Tabellen-Komponenten anpassen
- [ ] Validierungen aktualisieren

### 3. API-Route-Änderungen

Wenn Sie API-Parameter oder Response-Format ändern:
- [ ] Alle Frontend-Komponenten prüfen, die die API aufrufen
- [ ] Request-Body-Validierung anpassen
- [ ] Response-Typen aktualisieren
- [ ] Fehlerbehandlung überprüfen

### 4. Navigation-Änderungen

Wenn Sie Routen in `app/dashboard/admin/` hinzufügen/ändern:
- [ ] `components/app-sidebar.tsx` aktualisieren
- [ ] Breadcrumbs anpassen (falls vorhanden)
- [ ] Links im Dashboard aktualisieren

## 🔧 Entwicklung

### Scripts

```bash
# Entwicklungsserver starten
npm run dev

# Production-Build erstellen
npm run build

# Production-Server starten
npm run start

# Linting
npm run lint

# Type-Check (ohne Build)
npx tsc --noEmit
```

### MongoDB-Tests

```bash
# MongoDB-Verbindung testen
npm run test:mongodb

# MinIO-Verbindung testen
npm run test:minio

# Alle Services testen
npm run test:services
```

## 📦 Deployment

### Vercel (empfohlen)

```bash
# Vercel CLI installieren
npm i -g vercel

# Projekt deployen
vercel

# Environment-Variablen setzen
vercel env add MONGODB_URI
vercel env add MINIO_ENDPOINT
# ... weitere Variablen
```

### Docker

```bash
# Docker-Image erstellen
docker build -t geruestbau-erp .

# Container starten
docker run -p 3000:3000 --env-file .env geruestbau-erp
```

## 🔐 Sicherheit

- **Environment-Variablen**: Niemals in Git committen
- **API-Keys**: Nutzen Sie Vercel Environment Variables oder ähnliche Lösungen
- **MongoDB**: Verwenden Sie starke Passwörter und IP-Whitelisting
- **MinIO**: Aktivieren Sie SSL in Production (`MINIO_USE_SSL=true`)

## 🐛 Troubleshooting

### MongoDB-Verbindung schlägt fehl
```
Error: MongoServerError: connection timeout
```
**Lösung**: Prüfen Sie `MONGODB_URI` in `.env.local` und stellen Sie sicher, dass MongoDB läuft.

### MinIO-Upload schlägt fehl
```
Error: Access Denied
```
**Lösung**: Prüfen Sie `MINIO_ACCESS_KEY` und `MINIO_SECRET_KEY`. Stellen Sie sicher, dass der Bucket existiert.

### TypeScript-Fehler nach Änderungen
```
Type 'X' is not assignable to type 'Y'
```
**Lösung**: Führen Sie `npx tsc --noEmit` aus, um alle Fehler zu sehen. Aktualisieren Sie alle betroffenen Dateien.

## 📚 Weitere Dokumentation

- [Next.js 15 Docs](https://nextjs.org/docs)
- [React 19 Docs](https://react.dev)
- [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/)
- [MinIO JavaScript Client](https://min.io/docs/minio/linux/developers/javascript/minio-javascript.html)
- [ShadCN UI](https://ui.shadcn.com/)

## 🎯 Roadmap

Implementierte Features:
- ✅ Sidebar-Navigation
- ✅ Datenbank-Typen
- ✅ Mitarbeiter-Modul (CRUD)
- ✅ Zeiterfassung mit Freigabe-Workflow
- ✅ Dashboard mit Gerüstbau-KPIs

Geplante Features:
- ⏳ Projekt-Modul (vollständig)
- ⏳ Angebots-Erstellung mit PDF
- ⏳ Rechnungs-Modul mit Mahnwesen
- ⏳ Kalender mit FullCalendar
- ⏳ DATEV-Export
- ⏳ E-Mail-Versand
- ⏳ Statistiken & Reports
- ⏳ Mobile-Optimierung

## 👥 Mitwirken

Bei Fragen oder Problemen öffnen Sie bitte ein Issue oder erstellen Sie einen Pull Request.

## 📄 Lizenz

[Ihre Lizenz hier eintragen]

---

**Entwickelt mit ❤️ für effiziente Gerüstbau-Verwaltung**

