import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// GET - Einzelne Rechnung abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Rechnungs-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const rechnung = await db.collection('rechnungen').findOne({ _id: new ObjectId(id) })

    if (!rechnung) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ erfolg: true, rechnung })
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// DELETE - Rechnung löschen
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Rechnungs-ID' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const result = await db.collection('rechnungen').deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ erfolg: false, fehler: 'Rechnung nicht gefunden' }, { status: 404 })
    }
    
    return NextResponse.json({ erfolg: true, message: 'Rechnung gelöscht' })
  } catch (error) {
    console.error('Fehler:', error)
    return NextResponse.json({ erfolg: false, fehler: 'Fehler beim Löschen' }, { status: 500 })
  }
}

