import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Urlaub } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

// PUT - Urlaubsantrag aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const db = await getDatabase()
    const urlaubCollection = db.collection<Urlaub>('urlaub')
    
    const { _id, ...updateData } = body
    
    const result = await urlaubCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updateData,
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
      message: 'Urlaubsantrag erfolgreich aktualisiert'
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Urlaubsantrags:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren des Urlaubsantrags' },
      { status: 500 }
    )
  }
}

// DELETE - Urlaubsantrag löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const urlaubCollection = db.collection<Urlaub>('urlaub')
    
    const result = await urlaubCollection.deleteOne({ 
      _id: new ObjectId(id) 
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Urlaubsantrag nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Urlaubsantrag erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Urlaubsantrags:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Urlaubsantrags' },
      { status: 500 }
    )
  }
}
