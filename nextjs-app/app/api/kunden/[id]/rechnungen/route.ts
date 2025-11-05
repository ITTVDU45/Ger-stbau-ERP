import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Rechnung } from '@/lib/db/types'

// GET - Alle Rechnungen eines Kunden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const rechnungenCollection = db.collection<Rechnung>('rechnungen')
    
    const rechnungen = await rechnungenCollection
      .find({ kundeId: id })
      .sort({ rechnungsdatum: -1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, rechnungen })
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Rechnungen' },
      { status: 500 }
    )
  }
}

