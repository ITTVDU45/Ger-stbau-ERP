import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { KundenNotiz } from '@/lib/db/types'

// GET - Alle Notizen eines Kunden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const notizenCollection = db.collection<KundenNotiz>('kundennotizen')
    
    const notizen = await notizenCollection
      .find({ kundeId: id })
      .sort({ erstelltAm: -1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, notizen })
  } catch (error) {
    console.error('Fehler:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Notizen' },
      { status: 500 }
    )
  }
}

// POST - Neue Notiz anlegen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const db = await getDatabase()
    const notizenCollection = db.collection<KundenNotiz>('kundennotizen')
    
    const neueNotiz: KundenNotiz = {
      kundeId: id,
      titel: body.titel,
      inhalt: body.inhalt,
      typ: body.typ || 'notiz',
      autor: 'admin', // TODO: Aktuellen User verwenden
      autorName: 'Admin',
      erstelltAm: new Date()
    }
    
    const result = await notizenCollection.insertOne(neueNotiz as any)
    
    return NextResponse.json({ 
      erfolg: true, 
      notizId: result.insertedId,
      notiz: { ...neueNotiz, _id: result.insertedId }
    }, { status: 201 })
  } catch (error) {
    console.error('Fehler:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Anlegen der Notiz' },
      { status: 500 }
    )
  }
}

