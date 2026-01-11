/**
 * Plantafel Sync Service
 * 
 * Synchronisiert Einsätze aus der Plantafel mit der Zeiterfassung-Collection.
 * 
 * Funktionsweise:
 * - Bestätigte Einsätze (bestaetigt=true) erstellen automatisch Zeiterfassungs-Einträge
 * - Pro Tag: Haupt-Eintrag + optional Aufbau + Abbau (je nach gesetzten Zeiten)
 * - Bei Änderungen: Alte Zeiterfassungen löschen, neue erstellen
 * - Bei Löschung: Verknüpfte Zeiterfassungen auch löschen
 */

import { Db, ObjectId } from 'mongodb'
import { Einsatz, Zeiterfassung } from '@/lib/db/types'
import { eachDayOfInterval, format, startOfDay } from 'date-fns'

/**
 * Berechnet Stunden aus von/bis Zeitstrings
 */
function berechneStunden(von: string, bis: string): number {
  const [vonH, vonM] = von.split(':').map(Number)
  const [bisH, bisM] = bis.split(':').map(Number)
  const diffMinutes = (bisH * 60 + bisM) - (vonH * 60 + vonM)
  return Math.round((diffMinutes / 60) * 100) / 100 // Auf 2 Dezimalstellen runden
}

/**
 * Erstellt ein Zeiterfassungs-Objekt
 */
function createZeiterfassung(
  einsatz: Einsatz,
  datum: Date,
  von: string,
  bis: string,
  typ: 'aufbau' | 'abbau' | null
): Omit<Zeiterfassung, '_id'> {
  const stunden = berechneStunden(von, bis)
  
  return {
    mitarbeiterId: einsatz.mitarbeiterId,
    mitarbeiterName: einsatz.mitarbeiterName,
    projektId: einsatz.projektId,
    projektName: einsatz.projektName,
    datum: startOfDay(datum),
    von: von,
    bis: bis,
    stunden: stunden,
    taetigkeitstyp: typ || undefined,
    status: 'freigegeben', // Plantafel-Einträge sind bereits bestätigt
    beschreibung: typ 
      ? `Aus Plantafel: ${typ.charAt(0).toUpperCase() + typ.slice(1)} - ${einsatz.rolle || 'Einsatz'}`
      : `Aus Plantafel: ${einsatz.rolle || 'Einsatz'}`,
    einsatzId: einsatz._id?.toString(),
    automatischErstellt: true,
    erstelltAm: new Date(),
    zuletztGeaendert: new Date()
  }
}

/**
 * Extrahiert die Uhrzeit (HH:mm) aus einem Date-Objekt
 */
function extractTime(date: Date): string {
  return format(date, 'HH:mm')
}

/**
 * Erstellt Zeiterfassungs-Einträge für einen bestätigten Einsatz
 * - Pro Tag: Haupt-Eintrag + optional Aufbau + Abbau
 */
export async function syncEinsatzToZeiterfassung(
  einsatz: Einsatz,
  db: Db
): Promise<{ created: number; deleted: number }> {
  const zeiterfassungCollection = db.collection('Zeiterfassung')
  const einsatzId = einsatz._id?.toString()
  
  // Wenn nicht bestätigt, keine Zeiterfassungen erstellen
  if (!einsatz.bestaetigt) {
    // Falls vorher bestätigt war, alte Zeiterfassungen löschen
    const deleteResult = await zeiterfassungCollection.deleteMany({ 
      einsatzId: einsatzId 
    })
    return { created: 0, deleted: deleteResult.deletedCount }
  }
  
  // 1. Alte Zeiterfassungen löschen (falls Update)
  const deleteResult = await zeiterfassungCollection.deleteMany({ 
    einsatzId: einsatzId 
  })
  
  // 2. Für jeden Tag neue Zeiterfassungen erstellen
  const vonDate = new Date(einsatz.von)
  const bisDate = new Date(einsatz.bis)
  
  // Nur Tage im Intervall (nicht die genaue Uhrzeit für Intervall-Berechnung)
  const days = eachDayOfInterval({ 
    start: startOfDay(vonDate), 
    end: startOfDay(bisDate) 
  })
  
  const allZeiterfassungen: Omit<Zeiterfassung, '_id'>[] = []
  
  // Extrahiere Uhrzeiten aus den Einsatz-Daten
  const hauptVon = extractTime(vonDate)
  const hauptBis = extractTime(bisDate)
  
  for (const day of days) {
    // Haupt-Eintrag (normale Arbeitszeit) - nur wenn Uhrzeiten sinnvoll sind
    if (hauptVon !== '00:00' || hauptBis !== '00:00') {
      // Für mehrtägige Einsätze: erster Tag von Start bis 18:00, letzte Tag von 08:00 bis Ende
      // Für eintägige Einsätze: von Start bis Ende
      let dayVon = hauptVon
      let dayBis = hauptBis
      
      if (days.length === 1) {
        // Eintägiger Einsatz
        dayVon = hauptVon
        dayBis = hauptBis
      } else if (day.getTime() === startOfDay(vonDate).getTime()) {
        // Erster Tag eines mehrtägigen Einsatzes
        dayVon = hauptVon
        dayBis = '18:00' // Standard-Arbeitsende
      } else if (day.getTime() === startOfDay(bisDate).getTime()) {
        // Letzter Tag eines mehrtägigen Einsatzes
        dayVon = '08:00' // Standard-Arbeitsstart
        dayBis = hauptBis
      } else {
        // Mittlerer Tag
        dayVon = '08:00'
        dayBis = '18:00'
      }
      
      // Nur hinzufügen wenn Stunden > 0
      if (berechneStunden(dayVon, dayBis) > 0) {
        allZeiterfassungen.push(
          createZeiterfassung(einsatz, day, dayVon, dayBis, null)
        )
      }
    }
    
    // Aufbau-Eintrag (wenn gesetzt)
    if (einsatz.aufbauVon && einsatz.aufbauBis) {
      const aufbauStunden = berechneStunden(einsatz.aufbauVon, einsatz.aufbauBis)
      if (aufbauStunden > 0) {
        allZeiterfassungen.push(
          createZeiterfassung(einsatz, day, einsatz.aufbauVon, einsatz.aufbauBis, 'aufbau')
        )
      }
    }
    
    // Abbau-Eintrag (wenn gesetzt)
    if (einsatz.abbauVon && einsatz.abbauBis) {
      const abbauStunden = berechneStunden(einsatz.abbauVon, einsatz.abbauBis)
      if (abbauStunden > 0) {
        allZeiterfassungen.push(
          createZeiterfassung(einsatz, day, einsatz.abbauVon, einsatz.abbauBis, 'abbau')
        )
      }
    }
  }
  
  // 3. Alle Zeiterfassungen in die DB einfügen
  if (allZeiterfassungen.length > 0) {
    await zeiterfassungCollection.insertMany(allZeiterfassungen)
  }
  
  return { 
    created: allZeiterfassungen.length, 
    deleted: deleteResult.deletedCount 
  }
}

/**
 * Löscht alle verknüpften Zeiterfassungen eines Einsatzes
 */
export async function deleteZeiterfassungenForEinsatz(
  einsatzId: string,
  db: Db
): Promise<number> {
  const zeiterfassungCollection = db.collection('Zeiterfassung')
  const result = await zeiterfassungCollection.deleteMany({ 
    einsatzId: einsatzId 
  })
  return result.deletedCount
}

/**
 * Prüft ob Zeiterfassungen für einen Einsatz existieren
 */
export async function hasZeiterfassungenForEinsatz(
  einsatzId: string,
  db: Db
): Promise<boolean> {
  const zeiterfassungCollection = db.collection('Zeiterfassung')
  const count = await zeiterfassungCollection.countDocuments({ 
    einsatzId: einsatzId 
  })
  return count > 0
}

/**
 * Holt alle Zeiterfassungen für einen Einsatz
 */
export async function getZeiterfassungenForEinsatz(
  einsatzId: string,
  db: Db
): Promise<Zeiterfassung[]> {
  const zeiterfassungCollection = db.collection('Zeiterfassung')
  const result = await zeiterfassungCollection
    .find({ einsatzId: einsatzId })
    .sort({ datum: 1, taetigkeitstyp: 1 })
    .toArray()
  
  return result as unknown as Zeiterfassung[]
}
