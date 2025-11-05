import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Projekt } from '@/lib/db/types'

// GET - Alle Projekte abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const projekteCollection = db.collection<Projekt>('projekte')
    
    const projekte = await projekteCollection
      .find({})
      .sort({ beginn: -1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, projekte })
  } catch (error) {
    console.error('Fehler beim Abrufen der Projekte:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Projekte' },
      { status: 500 }
    )
  }
}

// POST - Neues Projekt anlegen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.projektname || !body.kundeId || !body.standort) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projektname, Kunde und Standort sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const projekteCollection = db.collection<Projekt>('projekte')
    
    const neuesProjekt: Projekt = {
      ...body,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await projekteCollection.insertOne(neuesProjekt as any)
    
    return NextResponse.json({ 
      erfolg: true, 
      projektId: result.insertedId,
      projekt: { ...neuesProjekt, _id: result.insertedId }
    }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Anlegen des Projekts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Anlegen des Projekts' },
      { status: 500 }
    )
  }
}

