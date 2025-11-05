import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ZahlungsbedingungenVorlage } from '@/lib/db/types'

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const vorlagen = await db.collection<ZahlungsbedingungenVorlage>('zahlungsbedingungen_vorlagen')
      .find({ aktiv: true })
      .sort({ name: 1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, vorlagen })
  } catch (error) {
    return NextResponse.json({ erfolg: false, fehler: 'Fehler beim Abrufen' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.name || !body.text) {
      return NextResponse.json({ erfolg: false, fehler: 'Name und Text erforderlich' }, { status: 400 })
    }

    const db = await getDatabase()
    const result = await db.collection<ZahlungsbedingungenVorlage>('zahlungsbedingungen_vorlagen').insertOne({
      name: body.name,
      text: body.text,
      kategorie: body.kategorie,
      aktiv: true,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    } as any)
    
    return NextResponse.json({ erfolg: true, vorlageId: result.insertedId }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ erfolg: false, fehler: 'Fehler beim Speichern' }, { status: 500 })
  }
}

