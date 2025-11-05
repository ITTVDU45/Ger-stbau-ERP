import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Projekt } from '@/lib/db/types'

// GET - Alle Projekte eines Kunden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const projekteCollection = db.collection<Projekt>('projekte')
    
    const projekte = await projekteCollection
      .find({ kundeId: id })
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

