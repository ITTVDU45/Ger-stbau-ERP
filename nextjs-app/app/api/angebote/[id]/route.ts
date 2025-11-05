import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Angebot } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

// GET - Einzelnes Angebot abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Angebot-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const angebot = await db.collection<Angebot>('angebote').findOne({ _id: new ObjectId(id) })

    if (!angebot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Angebot nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ erfolg: true, angebot })
  } catch (error) {
    console.error('Fehler beim Abrufen des Angebots:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// PUT - Angebot aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Angebot-ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const db = await getDatabase()
    
    // Altes Angebot laden, um anfrageId zu prüfen
    const altesAngebot = await db.collection<Angebot>('angebote').findOne({ _id: new ObjectId(id) })
    
    if (!altesAngebot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Angebot nicht gefunden' },
        { status: 404 }
      )
    }

    const neuerStatus = body.status
    const alterStatus = altesAngebot.status

    // Angebot aktualisieren
    const updateData = {
      ...body,
      _id: new ObjectId(id),
      zuletztGeaendert: new Date()
    }

    await db.collection('angebote').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    // Wenn Angebot gesendet wird und es eine verknüpfte Anfrage gibt:
    // Status der Anfrage auf "angebot_erstellt" setzen
    if (neuerStatus === 'gesendet' && alterStatus !== 'gesendet' && altesAngebot.anfrageId) {
      const neueAktivitaet = {
        aktion: 'Angebot versendet',
        benutzer: 'admin',
        zeitpunkt: new Date(),
        details: `Angebot ${altesAngebot.angebotsnummer} wurde an den Kunden versendet`
      }

      await db.collection('anfragen').updateOne(
        { _id: new ObjectId(altesAngebot.anfrageId) },
        {
          $set: {
            status: 'angebot_erstellt',
            zuletztGeaendert: new Date()
          },
          $push: {
            aktivitaeten: neueAktivitaet
          }
        }
      )
    }

    return NextResponse.json({
      erfolg: true,
      angebot: updateData
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Angebots:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// DELETE - Angebot löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Angebot-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Angebot laden, um anfrageId zu prüfen
    const angebot = await db.collection<Angebot>('angebote').findOne({ _id: new ObjectId(id) })
    
    if (!angebot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Angebot nicht gefunden' },
        { status: 404 }
      )
    }

    // Angebot löschen
    await db.collection('angebote').deleteOne({ _id: new ObjectId(id) })

    // Wenn es eine verknüpfte Anfrage gibt, Status zurücksetzen
    if (angebot.anfrageId) {
      await db.collection('anfragen').updateOne(
        { _id: new ObjectId(angebot.anfrageId) },
        {
          $set: {
            status: 'in_bearbeitung',
            zuletztGeaendert: new Date()
          },
          $unset: {
            angebotId: ''
          }
        }
      )
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Angebot erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Angebots:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
