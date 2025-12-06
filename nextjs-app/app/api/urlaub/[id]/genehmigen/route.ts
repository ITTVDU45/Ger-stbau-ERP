import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// POST - Urlaubsantrag genehmigen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const urlaubCollection = db.collection('urlaub')
    
    const result = await urlaubCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          status: 'genehmigt',
          genehmigungVon: 'admin', // TODO: Aktuellen User verwenden
          genehmigungAm: new Date(),
          zuletztGeaendert: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Urlaubsantrag nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Urlaubsantrag erfolgreich genehmigt'
    })
  } catch (error) {
    console.error('Fehler beim Genehmigen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Genehmigen' },
      { status: 500 }
    )
  }
}
