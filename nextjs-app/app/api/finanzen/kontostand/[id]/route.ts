import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { KontostandSnapshot } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// DELETE: Kontostand-Snapshot löschen
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
    const collection = db.collection<KontostandSnapshot>('kontostand_snapshots')
    
    // Hole Snapshot vor dem Löschen
    const snapshot = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!snapshot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kontostand-Snapshot nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Prüfe ob es der letzte/neueste Snapshot ist
    const mandantFilter = snapshot.mandantId ? { mandantId: snapshot.mandantId } : {}
    const neuesterSnapshot = await collection
      .findOne(mandantFilter, { sort: { datum: -1 } })
    
    // Warnung wenn es der neueste ist
    if (neuesterSnapshot && neuesterSnapshot._id.toString() === id) {
      console.log('⚠️ Warnung: Neuester Kontostand-Snapshot wird gelöscht')
    }
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kontostand-Snapshot nicht gefunden' },
        { status: 404 }
      )
    }
    
    console.log('🗑️ Kontostand-Snapshot gelöscht:', {
      id,
      betrag: snapshot.betrag,
      datum: snapshot.datum,
      typ: snapshot.typ
    })
    
    return NextResponse.json({ erfolg: true })
  } catch (error) {
    console.error('Fehler beim Löschen des Kontostand-Snapshots:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Kontostand-Snapshots' },
      { status: 500 }
    )
  }
}

