import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Kunde } from '@/lib/db/types'
import { Nummerngenerator } from '@/lib/utils/nummerngenerator'

// GET - Alle Kunden abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const kundenCollection = db.collection<Kunde>('kunden')
    
    // Optional: nur aktive oder alle
    const { searchParams } = new URL(request.url)
    const nurAktive = searchParams.get('nurAktive') === 'true'
    
    const filter = nurAktive ? { aktiv: true } : {}
    
    const kunden = await kundenCollection
      .find(filter)
      .sort({ firma: 1, nachname: 1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, kunden })
  } catch (error) {
    console.error('Fehler beim Abrufen der Kunden:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Kunden' },
      { status: 500 }
    )
  }
}

// POST - Neuen Kunden anlegen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validierung
    if (!body.firma && (!body.vorname || !body.nachname)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Firmenname oder Vor- und Nachname erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const kundenCollection = db.collection<Kunde>('kunden')
    
    // Kundennummer automatisch generieren
    const kundennummer = await Nummerngenerator.generiereKundennummer()
    
    const neuerKunde: Kunde = {
      ...body,
      kundennummer,
      aktiv: body.aktiv !== undefined ? body.aktiv : true,
      umsatzGesamt: 0,
      offenePosten: 0,
      anzahlProjekte: 0,
      anzahlAngebote: 0,
      anzahlRechnungen: 0,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await kundenCollection.insertOne(neuerKunde as any)
    
    return NextResponse.json({ 
      erfolg: true, 
      kundeId: result.insertedId,
      kunde: { ...neuerKunde, _id: result.insertedId }
    }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Anlegen des Kunden:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Anlegen des Kunden' },
      { status: 500 }
    )
  }
}

