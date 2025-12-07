import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Mitarbeiter } from '@/lib/db/types'

// GET - Alle Mitarbeiter abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    const mitarbeiter = await mitarbeiterCollection
      .find({})
      .sort({ nachname: 1, vorname: 1 })
      .toArray()
    
    return NextResponse.json({ 
      erfolg: true, 
      mitarbeiter 
    })
  } catch (error) {
    console.error('Fehler beim Abrufen der Mitarbeiter:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Mitarbeiter' },
      { status: 500 }
    )
  }
}

// Hilfsfunktion: Nächste Personalnummer generieren
async function generierePersonalnummer(mitarbeiterCollection: any): Promise<string> {
  // Alle Mitarbeiter mit Personalnummern im Format M-XXX holen
  const alleMitarbeiter = await mitarbeiterCollection
    .find({ personalnummer: { $regex: /^M-\d+$/ } })
    .sort({ personalnummer: -1 })
    .limit(1)
    .toArray()
  
  if (alleMitarbeiter.length === 0) {
    return 'M-001'
  }
  
  // Höchste Nummer extrahieren und um 1 erhöhen
  const hoechsteNummer = alleMitarbeiter[0].personalnummer
  const match = hoechsteNummer.match(/^M-(\d+)$/)
  
  if (match) {
    const naechsteNummer = parseInt(match[1], 10) + 1
    return `M-${String(naechsteNummer).padStart(3, '0')}`
  }
  
  return 'M-001'
}

// POST - Neuen Mitarbeiter anlegen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validierung
    if (!body.vorname || !body.nachname || !body.email) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Vorname, Nachname und E-Mail sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    // Prüfen ob E-Mail bereits existiert
    const existing = await mitarbeiterCollection.findOne({ email: body.email })
    if (existing) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ein Mitarbeiter mit dieser E-Mail existiert bereits' },
        { status: 400 }
      )
    }

    // Automatische Generierung der Personalnummer, falls nicht vorhanden
    let personalnummer = body.personalnummer
    if (!personalnummer || personalnummer.trim() === '') {
      personalnummer = await generierePersonalnummer(mitarbeiterCollection)
    }

    const neuerMitarbeiter: Mitarbeiter = {
      ...body,
      personalnummer,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date(),
      dokumente: body.dokumente || []
    }
    
    const result = await mitarbeiterCollection.insertOne(neuerMitarbeiter as any)
    
    return NextResponse.json({ 
      erfolg: true, 
      mitarbeiterId: result.insertedId,
      mitarbeiter: { ...neuerMitarbeiter, _id: result.insertedId }
    }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Anlegen des Mitarbeiters:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Anlegen des Mitarbeiters' },
      { status: 500 }
    )
  }
}

