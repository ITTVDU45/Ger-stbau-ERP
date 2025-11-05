import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Angebot } from '@/lib/db/types'

// GET - Alle Angebote eines Kunden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const angeboteCollection = db.collection<Angebot>('angebote')
    
    const angebote = await angeboteCollection
      .find({ kundeId: id })
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

