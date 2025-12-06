# Automatische Kalkulation - Implementierung

## Übersicht

Das System berechnet automatisch die **Vorkalkulation** basierend auf:
- Netto-Summe aus dem Angebot
- Stundensatz (aus globalen Einstellungen)
- Anzahl der zugewiesenen Mitarbeiter
- Verteilungsfaktor (70% Aufbau / 30% Abbau)

## Funktionsweise

### 1. Automatische Berechnung beim Annehmen eines Angebots

**Workflow:**
```
Angebot annehmen
    ↓
Projekt wird erstellt (mit Vorkalkulation)
    ↓
Vorkalkulation basiert auf 1 Mitarbeiter (Initial)
    ↓
Wenn Mitarbeiter zugewiesen werden → Neuberechnung
```

**Code:** `lib/workflows/angebotsAnnahme.ts`

### 2. Automatische Neuberechnung bei Mitarbeiter-Änderungen

**Trigger:**
- ✅ Mitarbeiter zuweisen
- ✅ Mitarbeiter entfernen
- ✅ Mitarbeiter-Daten bearbeiten

**Code:** 
- `app/api/projekte/[id]/mitarbeiter-zuweisen/route.ts` - Mitarbeiter zuweisen
- `app/api/projekte/[id]/angebot-zuweisen/route.ts` - Angebot zuweisen (NEU)
- `app/dashboard/admin/projekte/components/ProjektMitarbeiterTab.tsx` - Frontend

### 3. Manuelle Auto-Berechnung im Frontend

Im Kalkulation-Tab gibt es zwei Buttons:

1. **"Lokal berechnen"** (Blau)
   - Berechnet nur im Browser
   - Muss manuell gespeichert werden

2. **"Auto & Speichern"** (Grün) ⚡
   - Ruft API-Endpunkt auf
   - Berechnet und speichert automatisch
   - Nutzt aktuelle Projekt-Daten (Angebot + Mitarbeiter)

**Code:** `app/dashboard/admin/projekte/components/kalkulation/VorkalkulationEditor.tsx`

## API-Endpunkte

### POST `/api/kalkulation/[projektId]/auto-berechnen`

**Funktion:**
Berechnet automatisch die Vorkalkulation basierend auf Angebot und zugewiesenen Mitarbeitern.

**Berechnungsformel:**

```typescript
// 1. Gesamt-Stunden für Kolonne
gesamtStundenKolonne = angebotNetto / stundensatz

// 2. Verteilung nach 70/30 (Aufbau/Abbau)
sollStundenAufbauKolonne = gesamtStundenKolonne × 0.70
sollStundenAbbauKolonne = gesamtStundenKolonne × 0.30

// 3. Umsätze
sollUmsatzAufbau = sollStundenAufbauKolonne × stundensatz
sollUmsatzAbbau = sollStundenAbbauKolonne × stundensatz

// 4. Gesamt
gesamtSollStunden = sollStundenAufbauKolonne + sollStundenAbbauKolonne
gesamtSollUmsatz = sollUmsatzAufbau + sollUmsatzAbbau
```

**Pro-Mitarbeiter-Berechnung (nur im Frontend):**
```typescript
sollStundenAufbauProMA = sollStundenAufbauKolonne / anzahlMitarbeiter
sollStundenAbbauProMA = sollStundenAbbauKolonne / anzahlMitarbeiter
```

## Beispiel-Berechnung

**Gegeben:**
- Angebot Netto: **10.000 €**
- Stundensatz: **72 €/h**
- Zugewiesene Mitarbeiter: **2**

**Berechnung:**

1. Gesamt-Stunden Kolonne:
   ```
   10.000 € / 72 €/h = 138,89 h
   ```

2. Verteilung (70/30):
   ```
   Aufbau (70%): 138,89 × 0,70 = 97,22 h
   Abbau (30%):  138,89 × 0,30 = 41,67 h
   ```

3. Pro Mitarbeiter:
   ```
   Aufbau pro MA: 97,22 / 2 = 48,61 h/MA
   Abbau pro MA:  41,67 / 2 = 20,83 h/MA
   ```

4. Umsätze:
   ```
   Aufbau-Umsatz: 97,22 × 72 = 7.000 €
   Abbau-Umsatz:  41,67 × 72 = 3.000 €
   Gesamt:                     10.000 €
   ```

## Verwendung

### Im Frontend (Kalkulation-Tab)

1. **Automatische Berechnung:**
   - Klicke auf "Auto & Speichern" (grüner Button)
   - System nutzt aktuelle Angebots- und Mitarbeiterdaten
   - Wird automatisch gespeichert

2. **Lokale Berechnung:**
   - Klicke auf "Lokal berechnen" (blauer Button)
   - Passe Werte an
   - Klicke auf "Vorkalkulation speichern"

### Automatische Trigger

Die Vorkalkulation wird automatisch neu berechnet bei:

1. **Angebot annehmen**
   - Initial mit 1 Mitarbeiter
   - Workflow: `angebotsAnnahme.ts`

2. **Angebot einem bestehenden Projekt zuweisen**
   - Automatische Erstellung der Vorkalkulation
   - Route: `/api/projekte/[id]/angebot-zuweisen`

3. **Mitarbeiter zuweisen**
   - Automatische Neuberechnung mit neuer Mitarbeiteranzahl

4. **Mitarbeiter entfernen**
   - Automatische Neuberechnung mit reduzierter Mitarbeiteranzahl

5. **Mitarbeiter bearbeiten**
   - Automatische Neuberechnung (falls relevant)

## Datenfluss

### Workflow 1: Angebot annehmen (Neues Projekt)

```
┌─────────────────┐
│ Angebot (Netto) │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│ Projekt erstellen       │
│ + Vorkalkulation (1 MA) │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Mitarbeiter zuweisen    │
└────────┬────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│ API: auto-berechnen              │
│ - Liest Angebot Netto            │
│ - Zählt zugewiesene Mitarbeiter  │
│ - Berechnet Sollstunden (70/30)  │
│ - Speichert Vorkalkulation       │
└────────┬─────────────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Kalkulation aktualisiert│
│ + Nachkalkulation       │
└─────────────────────────┘
```

### Workflow 2: Angebot nachträglich zuweisen (Bestehendes Projekt)

```
┌──────────────────────────┐
│ Bestehendes Projekt      │
│ (ohne Angebot)           │
└────────┬─────────────────┘
         │
         ↓
┌──────────────────────────┐
│ Angebot zuweisen         │
│ (Dialog im Frontend)     │
└────────┬─────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│ API: angebot-zuweisen                │
│ - Projekt aktualisieren              │
│ - Budget setzen (angebot.netto)      │
│ - Vorkalkulation erstellen           │
│ - Nachkalkulation berechnen          │
└────────┬─────────────────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Kalkulation verfügbar   │
│ im Kalkulation-Tab      │
└─────────────────────────┘
```

## Technische Details

### Services

- **KalkulationService** (`lib/db/services/kalkulationService.ts`)
  - `getKalkulationsParameter()` - Holt Stundensatz + Verteilungsfaktor
  - `speichereVorkalkulation()` - Speichert Vorkalkulation
  - `berechneNachkalkulation()` - Berechnet Nachkalkulation aus Zeiterfassungen

### Datenbank-Typen

```typescript
interface Vorkalkulation {
  sollStundenAufbau: number      // Gesamt für Kolonne
  sollStundenAbbau: number       // Gesamt für Kolonne
  sollUmsatzAufbau: number
  sollUmsatzAbbau: number
  stundensatz: number
  gesamtSollStunden: number
  gesamtSollUmsatz: number
  erstelltAm: Date
  erstelltVon: string
  quelle: 'angebot' | 'manuell'
  angebotId?: string
}
```

### Einstellungen

**Globale Kalkulationsparameter** (in Company Settings):

```typescript
interface KalkulationsParameter {
  standardStundensatz: number      // z.B. 72 €/h
  verteilungsfaktor: {
    aufbau: number                // Standard: 70
    abbau: number                 // Standard: 30
  }
  rundungsregel: 'auf' | 'ab' | 'kaufmaennisch'
  farbschwellen: {
    gruen: { min: number, max: number }
    gelb: { min: number, max: number }
    rot: { min: number, max: number }
  }
}
```

## Best Practices

1. **Angebot vor Projekt erstellen**
   - Stelle sicher, dass ein Angebot existiert
   - Angebot sollte korrekte Netto-Summe haben

2. **Mitarbeiter zeitnah zuweisen**
   - Weise Mitarbeiter zu, sobald bekannt
   - System berechnet automatisch neu

3. **Manuelle Anpassungen möglich**
   - Auto-Berechnung ist ein Vorschlag
   - Kann jederzeit manuell angepasst werden

4. **Regelmäßige Überprüfung**
   - Prüfe Vorkalkulation nach Mitarbeiter-Änderungen
   - Vergleiche mit Nachkalkulation (Ist-Stunden)

## Fehlerbehandlung

Das System arbeitet robust:

- ❌ **Kein Angebot?** → Nutzt Projekt-Budget
- ❌ **Keine Mitarbeiter?** → Rechnet mit 1 Mitarbeiter
- ❌ **Fehler bei Auto-Berechnung?** → Mitarbeiter-Zuweisung bleibt erhalten

Alle Fehler werden geloggt, aber brechen die Hauptfunktionalität nicht ab.

## Logs

Erfolgreiche Auto-Berechnungen werden geloggt:

```
✓ Vorkalkulation automatisch neu berechnet nach Mitarbeiter-Zuweisung
✓ Vorkalkulation automatisch neu berechnet: 3 Mitarbeiter, 138.89h gesamt
```

## Zukünftige Erweiterungen

Mögliche Features:
- [ ] Unterschiedliche Stundensätze pro Mitarbeiter-Rolle
- [ ] Berücksichtigung von Urlaub/Abwesenheiten
- [ ] Automatische Anpassung bei Zeiterfassung
- [ ] Benachrichtigungen bei großen Abweichungen
- [ ] Export der Berechnungsgrundlage als PDF

---

**Stand:** November 2025  
**Version:** 1.0

