import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// GET - Alle Rechnungen zum Projekt laden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Projekt-ID' },
        { status: 400 }
      )
    }

    // Alle Rechnungen zum Projekt laden
    const rechnungen = await db
      .collection('rechnungen')
      .find({ projektId: id })
      .sort({ datum: -1 })
      .toArray()

    return NextResponse.json({
      erfolg: true,
      rechnungen: rechnungen.map(r => ({
        ...r,
        _id: r._id.toString()
      }))
    })
  } catch (error) {
    console.error('Fehler beim Laden der Rechnungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

