import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// DELETE - Vorlage löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const vorlagenCollection = db.collection('betreff_vorlagen')
    
    const result = await vorlagenCollection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Vorlage nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ erfolg: true })
  } catch (error) {
    console.error('Fehler beim Löschen der Vorlage:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen der Vorlage' },
      { status: 500 }
    )
  }
}

