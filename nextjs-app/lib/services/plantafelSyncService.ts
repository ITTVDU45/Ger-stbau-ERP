/**
 * Plantafel Sync Service
 * 
 * Synchronisiert Einsätze aus der Plantafel mit der Zeiterfassung-Collection.
 * 
 * Funktionsweise:
 * - Bestätigte Einsätze (bestaetigt=true) erstellen automatisch Zeiterfassungs-Einträge
 * - Aufbau: Pro Tag im Aufbau-Zeitraum (aufbauVon - aufbauBis) mit stundenAufbau
 * - Abbau: Pro Tag im Abbau-Zeitraum (abbauVon - abbauBis) mit stundenAbbau
 * - Bei Änderungen: Alte Zeiterfassungen löschen, neue erstellen
 * - Bei Löschung: Verknüpfte Zeiterfassungen auch löschen
 */

import { Db } from 'mongodb'
import { Einsatz, Zeiterfassung } from '@/lib/db/types'
import { eachDayOfInterval, format, startOfDay, differenceInDays } from 'date-fns'

/**
 * Erstellt ein Zeiterfassungs-Objekt
 */
function createZeiterfassung(
  einsatz: Einsatz,
  datum: Date,
  stunden: number,
  typ: 'aufbau' | 'abbau' | null,
  beschreibungPrefix: string
): Omit<Zeiterfassung, '_id'> {
  // Berechne Von/Bis basierend auf Stunden (Standard: 08:00 Start)
  const startHour = 8
  const endHour = startHour + Math.floor(stunden)
  const endMinutes = Math.round((stunden % 1) * 60)
  
  const von = `${String(startHour).padStart(2, '0')}:00`
  const bis = `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  
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
    beschreibung: `${beschreibungPrefix} - ${einsatz.rolle || 'Einsatz'}`,
    einsatzId: einsatz._id?.toString(),
    automatischErstellt: true,
    erstelltAm: new Date(),
    zuletztGeaendert: new Date()
  }
}

/**
 * Erstellt Zeiterfassungs-Einträge für einen bestätigten Einsatz
 * - Aufbau: Pro Tag im Aufbau-Zeitraum mit stundenAufbau
 * - Abbau: Pro Tag im Abbau-Zeitraum mit stundenAbbau
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
  
  const allZeiterfassungen: Omit<Zeiterfassung, '_id'>[] = []
  
  // 2. Aufbau-Zeiterfassungen erstellen
  if (einsatz.aufbauVon && einsatz.stundenAufbau && einsatz.stundenAufbau > 0) {
    const aufbauStart = startOfDay(new Date(einsatz.aufbauVon))
    const aufbauEnd = einsatz.aufbauBis 
      ? startOfDay(new Date(einsatz.aufbauBis)) 
      : aufbauStart
    
    const aufbauDays = eachDayOfInterval({ start: aufbauStart, end: aufbauEnd })
    
    // Stunden pro Tag berechnen (gleichmäßig verteilen)
    const stundenProTag = einsatz.stundenAufbau / aufbauDays.length
    
    for (const day of aufbauDays) {
      allZeiterfassungen.push(
        createZeiterfassung(
          einsatz, 
          day, 
          Math.round(stundenProTag * 10) / 10, // Auf 1 Dezimalstelle runden
          'aufbau',
          'Aus Plantafel: Aufbau'
        )
      )
    }
  }
  
  // 3. Abbau-Zeiterfassungen erstellen
  if (einsatz.abbauVon && einsatz.stundenAbbau && einsatz.stundenAbbau > 0) {
    const abbauStart = startOfDay(new Date(einsatz.abbauVon))
    const abbauEnd = einsatz.abbauBis 
      ? startOfDay(new Date(einsatz.abbauBis)) 
      : abbauStart
    
    const abbauDays = eachDayOfInterval({ start: abbauStart, end: abbauEnd })
    
    // Stunden pro Tag berechnen (gleichmäßig verteilen)
    const stundenProTag = einsatz.stundenAbbau / abbauDays.length
    
    for (const day of abbauDays) {
      allZeiterfassungen.push(
        createZeiterfassung(
          einsatz, 
          day, 
          Math.round(stundenProTag * 10) / 10, // Auf 1 Dezimalstelle runden
          'abbau',
          'Aus Plantafel: Abbau'
        )
      )
    }
  }
  
  // 4. Alle Zeiterfassungen in die DB einfügen
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
