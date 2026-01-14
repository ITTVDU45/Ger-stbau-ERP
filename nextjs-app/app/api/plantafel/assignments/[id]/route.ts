/**
 * API Route: /api/plantafel/assignments/[id]
 * 
 * PATCH: Aktualisiert einen Einsatz (z.B. bei Drag & Drop)
 * DELETE: Löscht einen Einsatz
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Einsatz, Mitarbeiter, Projekt } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { syncEinsatzToZeiterfassung, deleteZeiterfassungenForEinsatz } from '@/lib/services/plantafelSyncService'

/**
 * PATCH /api/plantafel/assignments/[id]
 * 
 * Aktualisiert einen bestehenden Einsatz.
 * Wird hauptsächlich für Drag & Drop und Resize verwendet.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Einsatz-ID' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { 
      mitarbeiterId, 
      projektId, 
      von, 
      bis, 
      rolle, 
      geplantStunden, 
      notizen, 
      bestaetigt,
      // NEU: Simplified date-only Felder
      setupDate,
      dismantleDate,
      // LEGACY: Aufbau/Abbau-Planung (Datum + Stunden)
      aufbauVon,
      aufbauBis,
      stundenAufbau,
      abbauVon,
      abbauBis,
      stundenAbbau
    } = body
    
    const db = await getDatabase()
    const einsatzCollection = db.collection<Einsatz>('einsatz')
    
    // Prüfe ob Einsatz existiert
    const existingEinsatz = await einsatzCollection.findOne({ _id: new ObjectId(id) })
    
    if (!existingEinsatz) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Einsatz nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Baue Update-Objekt
    const updateData: Partial<Einsatz> = {
      zuletztGeaendert: new Date()
    }
    
    // Aktualisiere Datumsfelder
    if (von !== undefined) {
      const vonDate = new Date(von)
      if (isNaN(vonDate.getTime())) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Ungültiges Startdatum' },
          { status: 400 }
        )
      }
      updateData.von = vonDate
    }
    
    if (bis !== undefined) {
      const bisDate = new Date(bis)
      if (isNaN(bisDate.getTime())) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Ungültiges Enddatum' },
          { status: 400 }
        )
      }
      updateData.bis = bisDate
    }
    
    // Validiere Datumsreihenfolge
    const finalVon = updateData.von || existingEinsatz.von
    const finalBis = updateData.bis || existingEinsatz.bis
    if (finalVon >= finalBis) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Startdatum muss vor Enddatum liegen' },
        { status: 400 }
      )
    }
    
    // Aktualisiere Mitarbeiter (falls geändert)
    if (mitarbeiterId !== undefined && mitarbeiterId !== existingEinsatz.mitarbeiterId) {
      const mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter')
        .findOne({ _id: new ObjectId(mitarbeiterId) })
      
      if (!mitarbeiter) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Mitarbeiter nicht gefunden' },
          { status: 404 }
        )
      }
      
      updateData.mitarbeiterId = mitarbeiterId
      updateData.mitarbeiterName = `${mitarbeiter.vorname} ${mitarbeiter.nachname}`
    }
    
    // Aktualisiere Projekt (falls geändert)
    if (projektId !== undefined && projektId !== existingEinsatz.projektId) {
      const projekt = await db.collection<Projekt>('projekte')
        .findOne({ _id: new ObjectId(projektId) })
      
      if (!projekt) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Projekt nicht gefunden' },
          { status: 404 }
        )
      }
      
      updateData.projektId = projektId
      updateData.projektName = projekt.projektname
    }
    
    // Aktualisiere optionale Felder
    if (rolle !== undefined) updateData.rolle = rolle
    if (geplantStunden !== undefined) updateData.geplantStunden = geplantStunden
    if (notizen !== undefined) updateData.notizen = notizen
    if (bestaetigt !== undefined) updateData.bestaetigt = bestaetigt
    
    // NEU: Simplified date-only Felder
    if (setupDate !== undefined) updateData.setupDate = setupDate || undefined
    if (dismantleDate !== undefined) updateData.dismantleDate = dismantleDate || undefined
    
    // LEGACY: Aufbau/Abbau-Planung (Datum + Stunden)
    if (aufbauVon !== undefined) updateData.aufbauVon = aufbauVon ? new Date(aufbauVon) : undefined
    if (aufbauBis !== undefined) updateData.aufbauBis = aufbauBis ? new Date(aufbauBis) : undefined
    if (stundenAufbau !== undefined) updateData.stundenAufbau = stundenAufbau || undefined
    if (abbauVon !== undefined) updateData.abbauVon = abbauVon ? new Date(abbauVon) : undefined
    if (abbauBis !== undefined) updateData.abbauBis = abbauBis ? new Date(abbauBis) : undefined
    if (stundenAbbau !== undefined) updateData.stundenAbbau = stundenAbbau || undefined
    
    // Update durchführen
    const result = await einsatzCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Einsatz nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Lade aktualisierten Einsatz
    const updatedEinsatz = await einsatzCollection.findOne({ _id: new ObjectId(id) })
    
    // NEU: Sync zu Zeiterfassung
    let syncResult = { created: 0, deleted: 0 }
    if (updatedEinsatz) {
      const einsatzWithId: Einsatz = {
        ...updatedEinsatz,
        _id: updatedEinsatz._id?.toString()
      }
      
      if (einsatzWithId.bestaetigt) {
        // Bestätigt: Zeiterfassungen erstellen/aktualisieren
        syncResult = await syncEinsatzToZeiterfassung(einsatzWithId, db)
      } else {
        // Nicht mehr bestätigt: Zeiterfassungen löschen
        const deletedCount = await deleteZeiterfassungenForEinsatz(id, db)
        syncResult = { created: 0, deleted: deletedCount }
      }
    }
    
    return NextResponse.json({
      erfolg: true,
      einsatz: {
        ...updatedEinsatz,
        _id: updatedEinsatz?._id?.toString()
      },
      zeiterfassungSync: syncResult
    })
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Einsatzes:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren des Einsatzes' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/plantafel/assignments/[id]
 * 
 * Löscht einen Einsatz
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Einsatz-ID' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const einsatzCollection = db.collection<Einsatz>('einsatz')
    
    // NEU: Zuerst verknüpfte Zeiterfassungen löschen
    const deletedZeiterfassungen = await deleteZeiterfassungenForEinsatz(id, db)
    
    const result = await einsatzCollection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Einsatz nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      erfolg: true,
      message: 'Einsatz erfolgreich gelöscht',
      zeiterfassungenGeloescht: deletedZeiterfassungen
    })
    
  } catch (error) {
    console.error('Fehler beim Löschen des Einsatzes:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Einsatzes' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/plantafel/assignments/[id]
 * 
 * Lädt einen einzelnen Einsatz
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Einsatz-ID' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const einsatz = await db.collection<Einsatz>('einsatz')
      .findOne({ _id: new ObjectId(id) })
    
    if (!einsatz) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Einsatz nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      erfolg: true,
      einsatz: {
        ...einsatz,
        _id: einsatz._id?.toString()
      }
    })
    
  } catch (error) {
    console.error('Fehler beim Laden des Einsatzes:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden des Einsatzes' },
      { status: 500 }
    )
  }
}
