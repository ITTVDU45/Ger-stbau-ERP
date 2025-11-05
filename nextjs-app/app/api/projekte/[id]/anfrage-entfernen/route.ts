import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// POST - Anfrage aus Projekt entfernen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Projekt-ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { anfrageId } = body

    if (!anfrageId) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Anfrage-ID fehlt' },
        { status: 400 }
      )
    }

    if (!ObjectId.isValid(anfrageId)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Anfrage-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Projekt laden
    const projekt = await db.collection('projekte').findOne({ _id: new ObjectId(id) })
    
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    // Anfrage laden
    const anfrage = await db.collection('anfragen').findOne({ _id: new ObjectId(anfrageId) })
    
    if (!anfrage) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Anfrage nicht gefunden' },
        { status: 404 }
      )
    }

    // Entferne anfrageId aus Projekt
    await db.collection('projekte').updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { anfrageIds: anfrageId },
        $set: { zuletztGeaendert: new Date() },
        $push: {
          aktivitaeten: {
            aktion: 'Anfrage entfernt',
            benutzer: 'admin',
            zeitpunkt: new Date(),
            details: `Anfrage ${anfrage.anfragenummer} wurde vom Projekt entfernt`
          }
        }
      }
    )

    // Entferne projektId aus Anfrage
    await db.collection('anfragen').updateOne(
      { _id: new ObjectId(anfrageId) },
      {
        $unset: { projektId: '' },
        $set: { zuletztGeaendert: new Date() },
        $push: {
          aktivitaeten: {
            aktion: 'Projekt-Zuweisung entfernt',
            benutzer: 'admin',
            zeitpunkt: new Date(),
            details: `Anfrage wurde von Projekt ${projekt.projektnummer} entfernt`
          }
        }
      }
    )

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Anfrage wurde vom Projekt entfernt'
    })

  } catch (error) {
    console.error('Fehler beim Entfernen der Anfrage:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

