# Plantafel (Ressourcen-Kalender)

Interaktive Plantafel für die Projekt- und Mitarbeitereinsatzplanung.

## Features

- **Team-View**: Zeilen = Mitarbeiter, Spalten = Zeitachse
- **Projekt-View**: Zeilen = Projekte, Spalten = Zeitachse
- **Drag & Drop**: Einsätze verschieben und verlängern/verkürzen
- **Konflikt-Erkennung**: Automatische Erkennung von Doppelbelegungen
- **Abwesenheiten**: Urlaub/Krankheit aus der Mitarbeiterverwaltung
- **Filter**: Nach Mitarbeiter, Projekt, Zeitraum filtern

## Installation

Die folgenden Packages werden benötigt (bereits installiert):

```bash
npm install react-big-calendar @tanstack/react-query zustand date-fns
npm install -D @types/react-big-calendar
```

## Dateistruktur

```
components/plantafel/
├── PlantafelBoard.tsx      # Haupt-Container mit Calendar
├── PlantafelToolbar.tsx    # View-Switch, Navigation, Filter
├── AssignmentDialog.tsx    # Create/Edit Dialog
├── ConflictPanel.tsx       # Konflikt-Liste (rechte Sidebar)
├── types.ts                # TypeScript Types
└── README.md               # Diese Datei

app/api/plantafel/
├── assignments/
│   ├── route.ts            # GET, POST
│   └── [id]/route.ts       # PATCH, DELETE
└── conflicts/
    └── route.ts            # GET (Konflikt-Berechnung)

lib/
├── stores/
│   └── plantafelStore.ts   # Zustand Store
├── queries/
│   └── plantafelQueries.ts # TanStack Query Hooks
└── services/
    └── outlook.ts          # Outlook-Integration (Platzhalter)

styles/
└── plantafel.css           # Kalender-Styles

providers/
└── query-provider.tsx      # QueryClient Provider
```

## Verwendung

Die Plantafel ist unter `/dashboard/admin/kalender` erreichbar.

### Seiten-Integration

```tsx
// app/dashboard/admin/kalender/page.tsx
import { QueryProvider } from '@/providers/query-provider'
import PlantafelBoard from '@/components/plantafel/PlantafelBoard'

export default function KalenderPage() {
  return (
    <QueryProvider>
      <PlantafelBoard />
    </QueryProvider>
  )
}
```

## API Endpoints

### GET /api/plantafel/assignments

Lädt Einsätze und Abwesenheiten für einen Zeitraum.

**Query-Parameter:**
- `from` (Pflicht): Start-Datum (ISO-Format)
- `to` (Pflicht): End-Datum (ISO-Format)
- `view`: `team` | `project` (Default: `team`)
- `employeeIds`: Komma-getrennte IDs
- `projectIds`: Komma-getrennte IDs
- `showAbsences`: `true` | `false` (Default: `true`)

**Response:**
```json
{
  "erfolg": true,
  "events": [...],
  "resources": [...],
  "conflicts": [...],
  "meta": {
    "from": "2026-01-01",
    "to": "2026-01-31",
    "totalEvents": 42,
    "totalConflicts": 2
  }
}
```

### POST /api/plantafel/assignments

Erstellt einen neuen Einsatz.

**Request Body:**
```json
{
  "mitarbeiterId": "...",
  "projektId": "...",
  "von": "2026-01-15T08:00:00Z",
  "bis": "2026-01-15T17:00:00Z",
  "rolle": "Vorarbeiter",
  "geplantStunden": 8,
  "notizen": "...",
  "bestaetigt": false
}
```

### PATCH /api/plantafel/assignments/[id]

Aktualisiert einen Einsatz (z.B. bei Drag & Drop).

### DELETE /api/plantafel/assignments/[id]

Löscht einen Einsatz.

### GET /api/plantafel/conflicts

Berechnet Konflikte für einen Zeitraum.

## Konflikt-Logik

Ein Konflikt wird erkannt wenn:

1. **Doppelbelegung**: Ein Mitarbeiter hat zwei überlappende Einsätze
2. **Einsatz während Abwesenheit**: Ein Einsatz überschneidet sich mit einem genehmigten Urlaub/Krankheit

**Schweregrade:**
- **Fehler (rot)**: Beide Events sind bestätigt
- **Warnung (orange)**: Mindestens ein Event ist noch geplant

## Zustand Store

Der `usePlantafelStore` Hook verwaltet:

```typescript
interface PlantafelState {
  view: 'team' | 'project'
  calendarView: 'week' | 'month' | 'day'
  dateRange: { start: Date, end: Date }
  filters: {
    employeeIds: string[]
    projectIds: string[]
    showAbsences: boolean
  }
  // ... Actions
}
```

## ENV-Variablen

Aktuell benötigt: **Keine** (verwendet bestehende MongoDB-Verbindung)

Für spätere Outlook-Integration:

```env
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
```

## Offene TODOs

### Phase 1 (aktuell)
- [x] React Big Calendar Integration
- [x] Drag & Drop
- [x] Konflikt-Erkennung
- [x] Team/Projekt-View
- [x] Filter

### Phase 2 (geplant)
- [ ] Outlook-Sync (Microsoft Graph API)
- [ ] Arbeitszeitmodelle pro Mitarbeiter
- [ ] Verfügbarkeits-Berechnung (Free/Busy)
- [ ] PDF-Export (Wochenplan)

### Phase 3 (optional)
- [ ] Mobile Optimierung
- [ ] Schichtplanung
- [ ] Automatische Vorschläge (KI)
- [ ] Mehrwöchige Ansicht

## Styling anpassen

Die Kalender-Styles befinden sich in `/styles/plantafel.css`.

Wichtige CSS-Klassen:
- `.plantafel-event-einsatz` - Standard-Einsatz
- `.plantafel-event-urlaub` - Urlaub
- `.plantafel-event-krankheit` - Krankheit
- `.plantafel-event-conflict` - Konflikt-Markierung

## Debugging

### React Query DevTools

Im Development-Modus werden die React Query DevTools angezeigt (unten rechts).

### Konsolen-Logs

Die Outlook-Stub-Funktionen loggen Aufrufe in die Konsole:
```
[Outlook] createOutlookEvent aufgerufen (Stub)
```

## Bekannte Einschränkungen

1. **Urlaube nicht verschiebbar**: Abwesenheiten müssen in der Mitarbeiterverwaltung bearbeitet werden
2. **Keine Echtzeit-Updates**: Daten werden bei Aktionen neu geladen
3. **Keine Offline-Unterstützung**: Erfordert Serververbindung
