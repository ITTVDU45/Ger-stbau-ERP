import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// POST - Angebot zu Projekt zuweisen
export async function POST(
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

    const body = await request.json()
    const { angebotId } = body

    if (!angebotId || !ObjectId.isValid(angebotId)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Angebots-ID' },
        { status: 400 }
      )
    }

    // Projekt laden
    const projekt = await db.collection('projekte').findOne({ _id: new ObjectId(id) })
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    // Angebot laden
    const angebot = await db.collection('angebote').findOne({ _id: new ObjectId(angebotId) })
    if (!angebot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Angebot nicht gefunden' },
        { status: 404 }
      )
    }

    // Prüfen ob Angebot angenommen wurde
    if (angebot.status !== 'angenommen') {
      return NextResponse.json(
        { erfolg: false, fehler: 'Angebot muss erst angenommen werden' },
        { status: 400 }
      )
    }

    // Neue Aktivität
    const neueAktivitaet = {
      aktion: 'Angebot zugewiesen',
      benutzer: body.benutzer || 'admin',
      zeitpunkt: new Date(),
      details: `Angebot ${angebot.angebotsnummer} wurde diesem Projekt zugewiesen`,
      typ: 'angebot'
    }

    // Projekt aktualisieren
    await db.collection('projekte').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'aktiv',
          angebotId: angebotId,
          angebotsnummer: angebot.angebotsnummer,
          angebotssumme: angebot.brutto || 0,
          offenerBetrag: angebot.brutto || 0,
          zuletztGeaendert: new Date()
        },
        $push: {
          aktivitaeten: neueAktivitaet as any
        }
      }
    )

    // Angebot aktualisieren (Status auf "projekt_zugeordnet")
    await db.collection('angebote').updateOne(
      { _id: new ObjectId(angebotId) },
      {
        $set: {
          projektId: id,
          projektnummer: projekt.projektnummer,
          zuletztGeaendert: new Date()
        }
      }
    )

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Angebot erfolgreich zugewiesen',
      projekt: {
        status: 'aktiv',
        angebotsnummer: angebot.angebotsnummer,
        angebotssumme: angebot.brutto
      }
    })
  } catch (error) {
    console.error('Fehler beim Zuweisen des Angebots:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

