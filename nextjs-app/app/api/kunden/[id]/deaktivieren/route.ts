import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// POST - Kunde deaktivieren/aktivieren (Toggle)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const kundenCollection = db.collection('kunden')
    
    // Aktuellen Status abrufen
    const kunde = await kundenCollection.findOne({ _id: new ObjectId(id) })
    if (!kunde) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kunde nicht gefunden' },
        { status: 404 }
      )
    }

    // Status umkehren
    const neuerStatus = !kunde.aktiv
    
    const result = await kundenCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          aktiv: neuerStatus,
          zuletztGeaendert: new Date()
        }
      }
    )
    
    return NextResponse.json({ 
      erfolg: true,
      message: `Kunde erfolgreich ${neuerStatus ? 'aktiviert' : 'deaktiviert'}`,
      aktiv: neuerStatus
    })
  } catch (error) {
    console.error('Fehler beim Deaktivieren:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Deaktivieren' },
      { status: 500 }
    )
  }
}

