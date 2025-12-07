import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Zeiterfassung } from '@/lib/db/types'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

// GET - Alle Zeiteinträge abrufen (optional gefiltert nach mitarbeiterId oder projektId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mitarbeiterId = searchParams.get('mitarbeiterId')
    const projektId = searchParams.get('projektId')
    
    console.log(`[GET Zeiterfassung] Filter: mitarbeiterId=${mitarbeiterId}, projektId=${projektId}`)
    
    const db = await getDatabase()
    const zeiterfassungCollection = db.collection<Zeiterfassung>('zeiterfassung')
    
    // Baue Filter auf
    const filter: any = {}
    if (mitarbeiterId) {
      filter.mitarbeiterId = mitarbeiterId
    }
    if (projektId) {
      filter.projektId = projektId
    }
    
    console.log(`[GET Zeiterfassung] MongoDB Filter:`, JSON.stringify(filter))
    
    const zeiterfassungen = await zeiterfassungCollection
      .find(filter)
      .sort({ datum: -1 })
      .toArray()
    
    console.log(`[GET Zeiterfassung] Gefunden: ${zeiterfassungen.length} Zeiterfassungen`)
    if (zeiterfassungen.length > 0) {
      console.log(`[GET Zeiterfassung] Erste Zeiterfassung: mitarbeiterId=${zeiterfassungen[0].mitarbeiterId}, projektId=${zeiterfassungen[0].projektId}, datum=${zeiterfassungen[0].datum}`)
    }
    
    return NextResponse.json({ erfolg: true, zeiterfassungen })
  } catch (error) {
    console.error('Fehler beim Abrufen der Zeiteinträge:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Zeiteinträge' },
      { status: 500 }
    )
  }
}

// POST - Neuen Zeiteintrag anlegen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.mitarbeiterId || !body.datum || !body.stunden) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mitarbeiter, Datum und Stunden sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const zeiterfassungCollection = db.collection<Zeiterfassung>('zeiterfassung')
    
    const neuerEintrag: Zeiterfassung = {
      ...body,
      taetigkeitstyp: body.taetigkeitstyp || 'aufbau', // Default: Aufbau
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await zeiterfassungCollection.insertOne(neuerEintrag as any)
    
    // Wenn Zeiterfassung mit Projekt verknüpft ist, berechne Nachkalkulation neu
    if (neuerEintrag.projektId && neuerEintrag.status === 'freigegeben') {
      // Asynchrone Berechnung ohne auf Ergebnis zu warten
      KalkulationService.berechneNachkalkulation(neuerEintrag.projektId).catch(err => {
        console.error('Fehler bei automatischer Nachkalkulation:', err)
      })
    }
    
    return NextResponse.json({ 
      erfolg: true, 
      eintragId: result.insertedId,
      eintrag: { ...neuerEintrag, _id: result.insertedId }
    }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Anlegen des Zeiteintrags:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Anlegen des Zeiteintrags' },
      { status: 500 }
    )
  }
}

