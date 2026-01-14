import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Einsatz } from '@/lib/db/types'

// GET - Alle Einsätze abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const einsatzCollection = db.collection<Einsatz>('einsaetze')
    
    const einsaetze = await einsatzCollection
      .find({})
      .sort({ von: -1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, einsaetze })
  } catch (error) {
    console.error('Fehler beim Abrufen der Einsätze:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Einsätze' },
      { status: 500 }
    )
  }
}

// POST - Neuen Einsatz anlegen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Nur Projekt, Von und Bis sind Pflichtfelder
    if (!body.projektId || !body.von || !body.bis) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt, Von und Bis sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const einsatzCollection = db.collection<Einsatz>('einsaetze')
    
    const neuerEinsatz: Einsatz = {
      ...body,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await einsatzCollection.insertOne(neuerEinsatz as any)
    
    return NextResponse.json({ 
      erfolg: true, 
      einsatzId: result.insertedId,
      einsatz: { ...neuerEinsatz, _id: result.insertedId }
    }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Anlegen des Einsatzes:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Anlegen des Einsatzes' },
      { status: 500 }
    )
  }
}

