import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Zeiterfassung } from '@/lib/db/types'

// GET - Alle Zeiteinträge abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const zeiterfassungCollection = db.collection<Zeiterfassung>('zeiterfassung')
    
    const zeiteintraege = await zeiterfassungCollection
      .find({})
      .sort({ datum: -1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, zeiteintraege })
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
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await zeiterfassungCollection.insertOne(neuerEintrag as any)
    
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

