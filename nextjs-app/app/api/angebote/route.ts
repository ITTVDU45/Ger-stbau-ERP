import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Angebot } from '@/lib/db/types'

// GET - Alle Angebote abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const kundeId = searchParams.get('kundeId')
    
    const db = await getDatabase()
    const angeboteCollection = db.collection<Angebot>('angebote')
    
    const filter: Record<string, unknown> = {}
    if (kundeId) {
      filter.kundeId = kundeId
    }
    
    const angebote = await angeboteCollection
      .find(filter)
      .sort({ datum: -1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, angebote })
  } catch (error) {
    console.error('Fehler beim Abrufen der Angebote:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Angebote' },
      { status: 500 }
    )
  }
}

// POST - Neues Angebot anlegen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.kundeId || !body.positionen || body.positionen.length === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kunde und mindestens eine Position sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const angeboteCollection = db.collection<Angebot>('angebote')
    
    const neuesAngebot: Angebot = {
      ...body,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await angeboteCollection.insertOne(neuesAngebot as any)
    
    return NextResponse.json({ 
      erfolg: true, 
      angebotId: result.insertedId,
      angebot: { ...neuesAngebot, _id: result.insertedId }
    }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Anlegen des Angebots:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Anlegen des Angebots' },
      { status: 500 }
    )
  }
}

