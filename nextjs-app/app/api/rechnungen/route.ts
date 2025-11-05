import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Rechnung } from '@/lib/db/types'

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const rechnungenCollection = db.collection<Rechnung>('rechnungen')
    
    const rechnungen = await rechnungenCollection.find({}).sort({ rechnungsdatum: -1 }).toArray()
    
    return NextResponse.json({ erfolg: true, rechnungen })
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnungen:', error)
    return NextResponse.json({ erfolg: false, fehler: 'Fehler beim Abrufen der Rechnungen' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.kundeId || !body.positionen || body.positionen.length === 0) {
      return NextResponse.json({ erfolg: false, fehler: 'Kunde und Positionen erforderlich' }, { status: 400 })
    }

    const db = await getDatabase()
    const rechnungenCollection = db.collection<Rechnung>('rechnungen')
    
    const neueRechnung: Rechnung = {
      ...body,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await rechnungenCollection.insertOne(neueRechnung as any)
    
    return NextResponse.json({ erfolg: true, rechnungId: result.insertedId, rechnung: { ...neueRechnung, _id: result.insertedId } }, { status: 201 })
  } catch (error) {
    console.error('Fehler:', error)
    return NextResponse.json({ erfolg: false, fehler: 'Fehler beim Anlegen der Rechnung' }, { status: 500 })
  }
}

