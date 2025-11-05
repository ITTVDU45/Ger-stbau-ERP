import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// GET - Einzelne Anfrage laden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Anfrage-ID' },
        { status: 400 }
      )
    }

    const anfrage = await db.collection('anfragen').findOne({ _id: new ObjectId(id) })

    if (!anfrage) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Anfrage nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      anfrage: {
        ...anfrage,
        _id: anfrage._id.toString()
      }
    })
  } catch (error) {
    console.error('Fehler beim Abrufen der Anfrage:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// PUT - Anfrage aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Anfrage-ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { _id, ...updateData } = body
    
    // Aktivität hinzufügen
    const neueAktivitaet = {
      aktion: 'Anfrage aktualisiert',
      benutzer: body.geaendertVon || 'admin',
      zeitpunkt: new Date(),
      details: 'Anfrage wurde bearbeitet'
    }
    
    const existingAnfrage = await db.collection('anfragen').findOne({ _id: new ObjectId(id) })
    const aktivitaeten = existingAnfrage?.aktivitaeten || []
    
    const result = await db.collection('anfragen').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          aktivitaeten: [...aktivitaeten, neueAktivitaet],
          zuletztGeaendert: new Date(),
          geaendertVon: body.geaendertVon || 'admin'
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Anfrage nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Anfrage erfolgreich aktualisiert'
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Anfrage:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// DELETE - Anfrage löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Anfrage-ID' },
        { status: 400 }
      )
    }

    const result = await db.collection('anfragen').deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Anfrage nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Anfrage erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen der Anfrage:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

