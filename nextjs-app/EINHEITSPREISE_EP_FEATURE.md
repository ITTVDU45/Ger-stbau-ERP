# Einheitspreise (E.P.) - Feature Dokumentation

## Übersicht

Das **Einheitspreise-Feature** ermöglicht es, Angebotspositionen mit "E.P." (Einheitspreis) zu markieren, die später im Projekt nachträglich bepreist werden. Dies ist besonders nützlich für Positionen wie **Miete**, deren endgültiger Preis erst im Projektverlauf feststeht.

---

## Funktionsweise

### 1. Angebot erstellen mit E.P. Positionen

Im Angebot können Positionen als **"Einheitspreis"** markiert werden:

```typescript
{
  position: "02",
  typ: "miete",
  beschreibung: "Miete (bezieht sich auf Pos. 1)",
  menge: 1.00,
  einheit: "St.",
  einzelpreis: 0,        // Bei E.P. auf 0 setzen
  gesamtpreis: 0,        // Bei E.P. auf 0 setzen
  preisTyp: "einheitspreis",  // ← NEU: Markiert als E.P.
  verknuepftMitPosition: "01" // Optional: Verknüpfung zu Basis-Position
}
```

**Wichtig:**
- `preisTyp: 'einheitspreis'` markiert die Position als E.P.
- `einzelpreis` und `gesamtpreis` werden auf 0 gesetzt
- Optional kann `verknuepftMitPosition` gesetzt werden, um die Abhängigkeit zu einer anderen Position zu dokumentieren

---

### 2. Anzeige im Projekt

#### Im **Angebote-Tab** (`ProjektAngeboteTab.tsx`):

E.P. Positionen werden mit dem Label **"E.P."** statt einer Summe angezeigt:

| Pos. | Beschreibung | Menge | Einzelpreis | Gesamt |
|------|--------------|-------|-------------|--------|
| 01   | Einrüstung   | 100 m² | 10,00 € | 1.000,00 € |
| 02   | Miete (bezieht sich auf Pos. 1) | 1,00 St. | **E.P.** | **E.P.** |

```tsx
// Anzeige-Logik
{pos.preisTyp === 'einheitspreis' ? (
  <span className="font-semibold text-blue-600">E.P.</span>
) : (
  <>{pos.einzelpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</>
)}
```

---

### 3. Einheitspreise im Projekt setzen

#### Im **Kalkulation-Tab** → **"Einheitspreise (E.P.)"**:

Neuer Tab für die Verwaltung aller E.P. Positionen:

**Features:**
- ✅ Übersicht aller Positionen mit `preisTyp === 'einheitspreis'`
- ✅ Eingabefelder für **Einzelpreise**
- ✅ Automatische Berechnung der **Gesamtpreise** (Menge × Einzelpreis)
- ✅ Status-Anzeige ("Gesetzt" / "Offen")
- ✅ Gesamtsumme aller E.P. Positionen
- ✅ Speichern-Button (nur aktiv wenn alle Preise gesetzt)

**Datenspeicherung:**
```typescript
{
  ...position,
  finalerEinzelpreis: 1400.00,  // ← Gesetzter Preis
  finalerGesamtpreis: 1400.00   // ← Berechnet: 1.00 St. × 1400 €
}
```

---

## Datenmodell

### Erweiterte `AngebotPosition` Interface

```typescript
export interface AngebotPosition {
  _id?: string
  position: string
  typ: 'material' | 'lohn' | 'miete' | 'transport' | 'sonstiges'
  beschreibung: string
  menge: number
  einheit: string
  einzelpreis: number
  gesamtpreis: number
  prozentsatz?: number
  materialId?: string
  verknuepftMitPosition?: string
  verknuepfungsTyp?: 'basis' | 'abhaengig'
  verknuepfungsBeschreibung?: string
  
  // ===== NEU: Einheitspreise =====
  preisTyp?: 'fest' | 'einheitspreis'
  finalerEinzelpreis?: number  // Wird im Projekt gesetzt
  finalerGesamtpreis?: number  // Wird automatisch berechnet
}
```

**Felder:**
- **`preisTyp`**: `'fest'` (Standard) oder `'einheitspreis'` (E.P.)
- **`finalerEinzelpreis`**: Der im Projekt gesetzte finale Einzelpreis
- **`finalerGesamtpreis`**: Automatisch berechnet = `menge × finalerEinzelpreis`

---

## Workflow

### Angebot erstellen
1. Position hinzufügen
2. `preisTyp` auf `'einheitspreis'` setzen
3. `einzelpreis` und `gesamtpreis` auf 0 setzen
4. Optional: `verknuepftMitPosition` setzen

### Angebot annehmen → Projekt erstellen
- E.P. Positionen werden mit in das Projekt übernommen
- Anzeige im Angebote-Tab zeigt "E.P." statt Preis

### Im Projekt: Einheitspreise setzen
1. **Kalkulation-Tab** öffnen
2. **"Einheitspreise (E.P.)"** Tab auswählen
3. Für jede Position den finalen **Einzelpreis** eingeben
4. System berechnet automatisch **Gesamtpreis**
5. **"Preise speichern"** klicken
6. Änderungen werden im Angebot gespeichert

### Automatische Integration
- Gesetzte Einheitspreise werden automatisch in die **Projektkalkulation** übernommen
- Bei Änderungen wird die **Gesamtkalkulation** neu berechnet

---

## API Endpoints

### GET `/api/angebote/[id]`
- Lädt Angebot mit allen Positionen inkl. E.P. Positionen

### PUT `/api/angebote/[id]`
- Aktualisiert Angebot mit gesetzten Einheitspreisen
- Body enthält aktualisierte `positionen` Array

**Beispiel Request:**
```json
{
  "positionen": [
    {
      "position": "02",
      "preisTyp": "einheitspreis",
      "finalerEinzelpreis": 1400.00,
      "finalerGesamtpreis": 1400.00,
      ...
    }
  ]
}
```

---

## Komponenten

### 1. **ProjektAngeboteTab.tsx**
- Zeigt E.P. Positionen mit "E.P." Label an
- Zeigt Verknüpfung zu Basis-Position

### 2. **ProjektKalkulationTab.tsx**
- Fügt neuen Tab "Einheitspreise (E.P.)" hinzu
- Integriert `EinheitspreisPositionen` Komponente

### 3. **EinheitspreisPositionen.tsx** (NEU)
- Verwaltet alle E.P. Positionen eines Projekts
- Eingabefelder für Einzelpreise
- Automatische Gesamtpreis-Berechnung
- Status-Anzeige und Validierung
- Speichern-Funktion

---

## Best Practices

### 1. Angebot erstellen
- Nutzen Sie `preisTyp: 'einheitspreis'` für Positionen, deren Preis später feststeht
- Setzen Sie `einzelpreis` und `gesamtpreis` auf 0
- Dokumentieren Sie Abhängigkeiten mit `verknuepftMitPosition`

### 2. Projekt-Phase
- Setzen Sie **alle** Einheitspreise vor der finalen Kalkulation
- Überprüfen Sie die automatisch berechneten Gesamtpreise
- Speichern Sie regelmäßig während der Eingabe

### 3. Kalkulation
- E.P. Positionen werden automatisch in die Projektkalkulation integriert
- Änderungen an Einheitspreisen triggern Neuberechnung der Gesamtkalkulation
- `finalerGesamtpreis` wird für die Projektauswertung verwendet

---

## Beispiel: Miete basierend auf Aufbau

**Angebot:**
```json
{
  "positionen": [
    {
      "position": "01",
      "typ": "material",
      "beschreibung": "Einrüstung Fassade",
      "menge": 100,
      "einheit": "qm",
      "einzelpreis": 10.00,
      "gesamtpreis": 1000.00,
      "preisTyp": "fest"
    },
    {
      "position": "02",
      "typ": "miete",
      "beschreibung": "Miete (bezieht sich auf Pos. 1)",
      "menge": 1.00,
      "einheit": "St.",
      "einzelpreis": 0,
      "gesamtpreis": 0,
      "preisTyp": "einheitspreis",
      "verknuepftMitPosition": "01"
    }
  ]
}
```

**Im Projekt nach Bepreisung:**
```json
{
  "positionen": [
    {
      "position": "01",
      ...
    },
    {
      "position": "02",
      "typ": "miete",
      "beschreibung": "Miete (bezieht sich auf Pos. 1)",
      "menge": 1.00,
      "einheit": "St.",
      "einzelpreis": 0,
      "gesamtpreis": 0,
      "preisTyp": "einheitspreis",
      "verknuepftMitPosition": "01",
      "finalerEinzelpreis": 1400.00,  // ← Gesetzt im Projekt
      "finalerGesamtpreis": 1400.00   // ← Automatisch berechnet
    }
  ]
}
```

---

## Vorteile

✅ **Flexibilität**: Preise können im Projektverlauf angepasst werden
✅ **Transparenz**: Klare Kennzeichnung mit "E.P." im gesamten System
✅ **Automatisierung**: Gesamtpreise werden automatisch berechnet
✅ **Kalkulation**: Nahtlose Integration in die Projektkalkulation
✅ **Nachvollziehbarkeit**: Verknüpfungen zu Basis-Positionen dokumentiert

---

## Zukünftige Erweiterungen

- [ ] Automatische Berechnung basierend auf Basis-Position (z.B. Miete = 14 × Aufbau-Summe)
- [ ] Historisierung von Preisänderungen
- [ ] Preisvorschläge basierend auf Erfahrungswerten
- [ ] Export von E.P. Positionen für externe Kalkulationen

