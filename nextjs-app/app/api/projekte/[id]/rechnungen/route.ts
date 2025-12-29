import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Mahnung } from '@/lib/db/types'

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

    // Offene Mahnungen abrufen
    const mahnungenCollection = db.collection<Mahnung>('mahnungen')
    const offeneMahnungen = await mahnungenCollection.find({
      projektId: id,
      status: { $in: ['zur_genehmigung', 'genehmigt', 'versendet'] }
    }).toArray()

    // Map für schnellen Zugriff: rechnungId -> hat offene Mahnung
    const rechnungenMitMahnungSet = new Set(
      offeneMahnungen.map(m => m.rechnungId)
    )

    const now = new Date()

    return NextResponse.json({
      erfolg: true,
      rechnungen: rechnungen.map(r => ({
        ...r,
        _id: r._id.toString(),
        istUeberfaellig: r.faelligAm && new Date(r.faelligAm) < now && r.status !== 'bezahlt',
        hatOffeneMahnung: rechnungenMitMahnungSet.has(r._id.toString())
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

