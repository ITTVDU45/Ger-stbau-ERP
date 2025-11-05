import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { BetreffVorlage } from '@/lib/db/types'

// GET - Alle Betreff-Vorlagen abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const vorlagenCollection = db.collection<BetreffVorlage>('betreff_vorlagen')
    
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
    
    if (!body.name || !body.text) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Name und Text sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const vorlagenCollection = db.collection<BetreffVorlage>('betreff_vorlagen')

    const neueVorlage: BetreffVorlage = {
      name: body.name,
      text: body.text,
      kategorie: body.kategorie || '',
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

