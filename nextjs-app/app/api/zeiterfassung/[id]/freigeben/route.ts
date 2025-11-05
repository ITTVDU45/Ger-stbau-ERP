import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// POST - Zeiteintrag freigeben
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase()
    const zeiterfassungCollection = db.collection('zeiterfassung')
    
    const result = await zeiterfassungCollection.updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: {
          status: 'freigegeben',
          freigegebenVon: 'admin', // TODO: Aktuellen User verwenden
          freigegebenAm: new Date(),
          zuletztGeaendert: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Zeiteintrag nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Zeiteintrag erfolgreich freigegeben'
    })
  } catch (error) {
    console.error('Fehler beim Freigeben:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Freigeben' },
      { status: 500 }
    )
  }
}

