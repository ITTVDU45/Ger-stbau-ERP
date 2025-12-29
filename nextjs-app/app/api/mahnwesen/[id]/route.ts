import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

/**
 * GET /api/mahnwesen/:id
 * Liefert eine einzelne Mahnung mit allen verknüpften Daten
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Mahnungs-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mahnungenCollection = db.collection('mahnungen')
    const rechnungenCollection = db.collection('rechnungen')
    const kundenCollection = db.collection('kunden')
    const projekteCollection = db.collection('projekte')

    const mahnung = await mahnungenCollection.findOne({ _id: new ObjectId(id) })

    if (!mahnung) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mahnung nicht gefunden' },
        { status: 404 }
      )
    }

    // Lade verknüpfte Daten
    const [rechnung, kunde, projekt] = await Promise.all([
      rechnungenCollection.findOne({ _id: new ObjectId(mahnung.rechnungId) }),
      kundenCollection.findOne({ _id: new ObjectId(mahnung.kundeId) }),
      mahnung.projektId
        ? projekteCollection.findOne({ _id: new ObjectId(mahnung.projektId) })
        : null
    ])

    return NextResponse.json({
      erfolg: true,
      mahnung,
      rechnung,
      kunde,
      projekt
    })
  } catch (error) {
    console.error('[GET /api/mahnwesen/:id] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Mahnung',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/mahnwesen/:id
 * Aktualisiert eine Mahnung
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Mahnungs-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mahnungenCollection = db.collection('mahnungen')

    const mahnung = await mahnungenCollection.findOne({ _id: new ObjectId(id) })
    if (!mahnung) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mahnung nicht gefunden' },
        { status: 404 }
      )
    }

    // Erlaubte Felder zum Aktualisieren
    const updateFields: any = {
      zuletztGeaendert: new Date()
    }

    if (body.mahnungstext !== undefined) {
      updateFields.mahnungstext = body.mahnungstext
      updateFields.mahnungstextVersion = (mahnung.mahnungstextVersion || 1) + 1
    }

    if (body.status !== undefined) {
      updateFields.status = body.status
    }

    if (body.notizen !== undefined) {
      updateFields.notizen = body.notizen
    }

    if (body.mahngebuehren !== undefined) {
      updateFields.mahngebuehren = body.mahngebuehren
      // Neuberechnung Gesamtforderung
      updateFields.gesamtforderung =
        mahnung.offenerBetrag +
        body.mahngebuehren +
        (mahnung.verzugszinsen || 0)
    }

    if (body.verzugszinsen !== undefined) {
      updateFields.verzugszinsen = body.verzugszinsen
      // Neuberechnung Gesamtforderung
      updateFields.gesamtforderung =
        mahnung.offenerBetrag +
        (mahnung.mahngebuehren || 0) +
        body.verzugszinsen
    }

    // Chronik-Eintrag hinzufügen
    const chronikEintrag = {
      aktion: 'bearbeitet' as const,
      benutzer: 'admin', // TODO: Von Session holen
      zeitpunkt: new Date(),
      details: 'Mahnung wurde bearbeitet'
    }

    if (body.status && body.status !== mahnung.status) {
      chronikEintrag.aktion = 'bearbeitet'
      chronikEintrag.details = `Status geändert von "${mahnung.status}" zu "${body.status}"`
    }

    await mahnungenCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updateFields,
        $push: { chronik: chronikEintrag }
      }
    )

    const aktualisiert = await mahnungenCollection.findOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      erfolg: true,
      mahnung: aktualisiert
    })
  } catch (error) {
    console.error('[PUT /api/mahnwesen/:id] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Aktualisieren der Mahnung',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/mahnwesen/:id
 * Löscht eine Mahnung (nur wenn noch nicht versendet)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Mahnungs-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mahnungenCollection = db.collection('mahnungen')

    const mahnung = await mahnungenCollection.findOne({ _id: new ObjectId(id) })
    if (!mahnung) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mahnung nicht gefunden' },
        { status: 404 }
      )
    }

    // Prüfe ob Mahnung bereits versendet wurde
    if (mahnung.status === 'versendet' || mahnung.versandtAm) {
      return NextResponse.json(
        {
          erfolg: false,
          fehler: 'Mahnung kann nicht gelöscht werden',
          details: 'Mahnung wurde bereits versendet'
        },
        { status: 403 }
      )
    }

    await mahnungenCollection.deleteOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Mahnung erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('[DELETE /api/mahnwesen/:id] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Löschen der Mahnung',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

