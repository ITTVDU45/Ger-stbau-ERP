import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// POST - Zeiteintrag ablehnen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const zeiterfassungCollection = db.collection('zeiterfassung')
    
    const result = await zeiterfassungCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          status: 'abgelehnt',
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
      message: 'Zeiteintrag abgelehnt'
    })
  } catch (error) {
    console.error('Fehler beim Ablehnen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Ablehnen' },
      { status: 500 }
    )
  }
}

