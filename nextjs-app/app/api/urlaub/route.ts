import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Urlaub } from '@/lib/db/types'

// GET - Alle Urlaubsanträge abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const urlaubCollection = db.collection<Urlaub>('urlaub')
    
    const urlaube = await urlaubCollection
      .find({})
      .sort({ von: -1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, urlaube })
  } catch (error) {
    console.error('Fehler beim Abrufen der Urlaubsanträge:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Urlaubsanträge' },
      { status: 500 }
    )
  }
}

// POST - Neuen Urlaubsantrag anlegen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.mitarbeiterId || !body.von || !body.bis) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mitarbeiter, Von und Bis sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const urlaubCollection = db.collection<Urlaub>('urlaub')
    
    const neuerUrlaub: Urlaub = {
      ...body,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await urlaubCollection.insertOne(neuerUrlaub as any)
    
    return NextResponse.json({ 
      erfolg: true, 
      urlaubId: result.insertedId,
      urlaub: { ...neuerUrlaub, _id: result.insertedId }
    }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Anlegen des Urlaubsantrags:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Anlegen des Urlaubsantrags' },
      { status: 500 }
    )
  }
}

