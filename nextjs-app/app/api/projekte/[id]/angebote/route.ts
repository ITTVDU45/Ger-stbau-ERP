import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// GET - Alle Angebote zum Projekt laden (über kundeId)
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

    // Projekt laden um kundeId zu erhalten
    const projekt = await db.collection('projekte').findOne({ _id: new ObjectId(id) })
    
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    // Alle Angebote des Kunden laden
    const angebote = await db
      .collection('angebote')
      .find({ kundeId: projekt.kundeId })
      .sort({ datum: -1 })
      .toArray()

    return NextResponse.json({
      erfolg: true,
      angebote: angebote.map(a => ({
        ...a,
        _id: a._id.toString()
      })),
      zugewiesenesAngebotId: projekt.angebotId
    })
  } catch (error) {
    console.error('Fehler beim Laden der Angebote:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

