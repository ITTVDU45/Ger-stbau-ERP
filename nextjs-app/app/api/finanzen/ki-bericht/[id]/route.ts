import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// DELETE: KI-Bericht löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Bericht-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const collection = db.collection('finanzen_ki_berichte')
    
    // Soft-Delete: setze aktiv = false
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { aktiv: false } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Bericht nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Bericht erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des KI-Berichts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des KI-Berichts' },
      { status: 500 }
    )
  }
}

// GET: Einzelnen KI-Bericht abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Bericht-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const collection = db.collection('finanzen_ki_berichte')
    
    const bericht = await collection.findOne({ _id: new ObjectId(id) })

    if (!bericht) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Bericht nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      bericht
    })
  } catch (error) {
    console.error('Fehler beim Abrufen des KI-Berichts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen des KI-Berichts' },
      { status: 500 }
    )
  }
}

