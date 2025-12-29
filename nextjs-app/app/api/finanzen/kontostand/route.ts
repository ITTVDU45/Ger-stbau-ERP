import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { KontostandSnapshot } from '@/lib/db/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Aktuellen Kontostand + Historie abrufen
export async function GET(request: NextRequest) {
  try {
    const mandantId = request.nextUrl.searchParams.get('mandantId')
    
    const db = await getDatabase()
    const collection = db.collection<KontostandSnapshot>('kontostand_snapshots')
    
    // Hole alle Snapshots, sortiert nach Datum (neuste zuerst)
    const query = mandantId ? { mandantId } : {}
    const snapshots = await collection
      .find(query)
      .sort({ datum: -1 })
      .limit(50) // Maximal 50 Historie-Einträge
      .toArray()
    
    const aktueller = snapshots[0] || null
    
    return NextResponse.json({
      erfolg: true,
      aktueller,
      historie: snapshots
    })
  } catch (error) {
    console.error('Fehler beim Abrufen des Kontostands:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen des Kontostands' },
      { status: 500 }
    )
  }
}

// POST: Neuen Kontostand-Snapshot erstellen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validierung
    if (typeof body.betrag !== 'number') {
      return NextResponse.json(
        { erfolg: false, fehler: 'Betrag muss eine Zahl sein' },
        { status: 400 }
      )
    }
    
    if (!body.datum) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Datum ist erforderlich' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const collection = db.collection<KontostandSnapshot>('kontostand_snapshots')
    
    const snapshot: KontostandSnapshot = {
      mandantId: body.mandantId || null,
      betrag: body.betrag,
      datum: new Date(body.datum),
      notiz: body.notiz || '',
      typ: body.typ || 'manuell',
      erstelltVon: body.erstelltVon || 'system',
      erstelltAm: new Date()
    }
    
    const result = await collection.insertOne(snapshot)
    const neuerSnapshot = await collection.findOne({ _id: result.insertedId })
    
    console.log('✅ Kontostand-Snapshot erstellt:', neuerSnapshot)
    
    return NextResponse.json({
      erfolg: true,
      snapshot: neuerSnapshot
    }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Erstellen des Kontostand-Snapshots:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Erstellen des Kontostand-Snapshots' },
      { status: 500 }
    )
  }
}

