import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { PositionsVorlage } from '@/lib/db/types'

// GET - Alle Positions-Vorlagen abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const vorlagenCollection = db.collection<PositionsVorlage>('positionen_vorlagen')
    
    const vorlagen = await vorlagenCollection
      .find({ aktiv: true })
      .sort({ kategorie: 1, name: 1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, vorlagen })
  } catch (error) {
    console.error('Fehler beim Abrufen der Vorlagen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Vorlagen' },
      { status: 500 }
    )
  }
}

// POST - Neue Vorlage anlegen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.shortcode || !body.name || !body.beschreibung) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Shortcode, Name und Beschreibung sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const vorlagenCollection = db.collection<PositionsVorlage>('positionen_vorlagen')
    
    // Prüfen ob Shortcode bereits existiert
    const existing = await vorlagenCollection.findOne({ shortcode: body.shortcode })
    if (existing) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Shortcode bereits vorhanden' },
        { status: 400 }
      )
    }

    const neueVorlage: PositionsVorlage = {
      ...body,
      aktiv: true,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await vorlagenCollection.insertOne(neueVorlage as any)
    
    return NextResponse.json({ 
      erfolg: true, 
      vorlageId: result.insertedId,
      vorlage: { ...neueVorlage, _id: result.insertedId }
    }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Anlegen der Vorlage:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Anlegen der Vorlage' },
      { status: 500 }
    )
  }
}

