# Fix: Angebot-Werte werden nicht in Kalkulation übernommen

## Problem

Wenn ein Angebot einem **bestehenden Projekt** nachträglich zugewiesen wurde (über den Dialog im Angebote-Tab), wurden die Werte aus dem Angebot **nicht automatisch in die Vorkalkulation übernommen**.

### Betroffene Szenarien

❌ **Funktionierte NICHT:**
```
1. Projekt manuell erstellen (ohne Angebot)
2. Später: Angebot über Dialog zuweisen
3. Ergebnis: Keine Vorkalkulation → Kalkulationstab leer
```

✅ **Funktionierte bereits:**
```
1. Angebot erstellen → Annehmen
2. System erstellt automatisch Projekt mit Vorkalkulation
3. Ergebnis: Kalkulation vorhanden
```

## Lösung

Die API-Route `/api/projekte/[id]/angebot-zuweisen` wurde erweitert, um **automatisch die Vorkalkulation zu erstellen**, wenn ein Angebot einem Projekt zugewiesen wird.

### Geänderte Datei

📁 `app/api/projekte/[id]/angebot-zuweisen/route.ts`

**Änderungen:**

1. ✅ **Budget-Feld setzen**
   ```typescript
   budget: angebot.netto || 0  // WICHTIG für Kalkulation
   ```

2. ✅ **Vorkalkulation automatisch berechnen**
   ```typescript
   // Berechnung basierend auf:
   - angebot.netto (Netto-Summe)
   - zugewiesene Mitarbeiter (oder 1 als Default)
   - Stundensatz aus Einstellungen
   - Verteilungsfaktor 70/30 (Aufbau/Abbau)
   ```

3. ✅ **Nachkalkulation initialisieren**
   ```typescript
   await KalkulationService.berechneNachkalkulation(id)
   ```

## Workflow nach dem Fix

### Szenario 1: Neues Projekt aus Angebot

```
Angebot annehmen
    ↓
Projekt automatisch erstellen
    ↓
✓ Vorkalkulation vorhanden (1 Mitarbeiter)
```

### Szenario 2: Bestehendes Projekt + Angebot zuweisen (NEU GEFIXED)

```
Projekt manuell erstellen
    ↓
Angebot über Dialog zuweisen
    ↓
✓ Vorkalkulation automatisch erstellt
✓ Budget aus Angebot übernommen
✓ Nachkalkulation initialisiert
```

### Szenario 3: Mitarbeiter später zuweisen

```
Projekt mit Angebot (Vorkalkulation vorhanden)
    ↓
Mitarbeiter zuweisen
    ↓
✓ Vorkalkulation automatisch neu berechnet
✓ Neue Mitarbeiteranzahl berücksichtigt
```

## Testen

### Test 1: Bestehendes Projekt

1. ✅ Erstelle ein **neues Projekt** (ohne Angebot)
2. ✅ Gehe zum **Angebote-Tab** des Projekts
3. ✅ Klicke auf **"Angebot zuweisen"**
4. ✅ Wähle ein angenommenes Angebot aus
5. ✅ Bestätige die Zuweisung
6. ✅ Gehe zum **Kalkulation-Tab**
7. ✅ **Erwartetes Ergebnis:**
   - Netto-Umsatz aus Angebot ist sichtbar
   - Stundensatz ist gesetzt
   - Sollstunden Aufbau/Abbau berechnet (70/30)
   - "Lokal berechnen" und "Auto & Speichern" Buttons verfügbar

### Test 2: Mitarbeiter hinzufügen

1. ✅ Öffne das Projekt mit zugewiesenem Angebot
2. ✅ Gehe zum **Mitarbeiter-Tab**
3. ✅ Weise **2-3 Mitarbeiter** zu
4. ✅ Gehe zum **Kalkulation-Tab**
5. ✅ **Erwartetes Ergebnis:**
   - Anzahl Mitarbeiter korrekt angezeigt
   - Sollstunden pro MA neu berechnet
   - Gesamt-Sollstunden angepasst

### Test 3: Auto & Speichern Button

1. ✅ Öffne Kalkulation-Tab eines Projekts mit Angebot
2. ✅ Klicke auf **"Auto & Speichern"** (grüner Button)
3. ✅ **Erwartetes Ergebnis:**
   - Success-Toast: "Vorkalkulation automatisch berechnet und gespeichert!"
   - Werte werden sofort aktualisiert
   - Keine manuelle Speicherung nötig

## Technische Details

### Berechnungsformel

```typescript
// 1. Gesamt-Stunden Kolonne
gesamtStunden = angebotNetto / stundensatz

// 2. Verteilung (70% Aufbau / 30% Abbau)
aufbauStunden = gesamtStunden × 0.70
abbauStunden = gesamtStunden × 0.30

// 3. Umsätze
aufbauUmsatz = aufbauStunden × stundensatz
abbauUmsatz = abbauStunden × stundensatz

// 4. Pro Mitarbeiter (nur Frontend-Anzeige)
aufbauProMA = aufbauStunden / anzahlMitarbeiter
abbauProMA = abbauStunden / anzahlMitarbeiter
```

### Beispiel-Berechnung

**Gegeben:**
- Angebot Netto: 10.000 €
- Stundensatz: 72 €/h
- Mitarbeiter: 2

**Berechnung:**
```
Gesamt-Stunden: 10.000 / 72 = 138,89 h

Aufbau (70%): 138,89 × 0,70 = 97,22 h
Abbau (30%):  138,89 × 0,30 = 41,67 h

Pro MA:
  Aufbau: 97,22 / 2 = 48,61 h/MA
  Abbau:  41,67 / 2 = 20,83 h/MA

Umsätze:
  Aufbau: 97,22 × 72 = 7.000 €
  Abbau:  41,67 × 72 = 3.000 €
  Gesamt:            10.000 € ✓
```

## Logs

Erfolgreiche Berechnungen werden geloggt:

```
✓ Vorkalkulation automatisch erstellt beim Angebot-Zuweisen: 2 MA, 138.89h
✓ Vorkalkulation automatisch neu berechnet nach Mitarbeiter-Zuweisung
```

## Fehlerbehandlung

Das System ist robust:

- ✅ **Kein Angebot?** → Nutzt Projekt-Budget als Fallback
- ✅ **Keine Mitarbeiter?** → Rechnet mit 1 Mitarbeiter
- ✅ **Fehler bei Berechnung?** → Angebot-Zuweisung bleibt erhalten
- ✅ **Alle Fehler werden geloggt** → Keine stillen Fehler

## Zusammenfassung

### Was wurde geändert?

1. ✅ `/api/projekte/[id]/angebot-zuweisen` erweitert
2. ✅ Automatische Vorkalkulation beim Angebot-Zuweisen
3. ✅ Budget-Feld korrekt setzen
4. ✅ Dokumentation aktualisiert

### Wo wird automatisch berechnet?

1. ✅ Angebot annehmen → Neues Projekt
2. ✅ **Angebot bestehenden Projekt zuweisen (NEU)**
3. ✅ Mitarbeiter zuweisen
4. ✅ Mitarbeiter entfernen
5. ✅ Mitarbeiter bearbeiten

### Manuelle Berechnung

Im Kalkulation-Tab:
- **"Lokal berechnen"** (Blau) - Nur im Browser
- **"Auto & Speichern"** (Grün) - Berechnet + speichert

---

**Status:** ✅ Behoben  
**Datum:** November 2025  
**Getestet:** Bereit für Testing

