import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// POST - Urlaubsantrag ablehnen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const db = await getDatabase()
    const urlaubCollection = db.collection('urlaub')
    
    const result = await urlaubCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          status: 'abgelehnt',
          ablehnungsgrund: body.grund || '',
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
      message: 'Urlaubsantrag abgelehnt'
    })
  } catch (error) {
    console.error('Fehler beim Ablehnen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Ablehnen' },
      { status: 500 }
    )
  }
}
