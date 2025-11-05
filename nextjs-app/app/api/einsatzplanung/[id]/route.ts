import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Einsatz } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

// PUT - Einsatz aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    if (!body.mitarbeiterId || !body.projektId || !body.von || !body.bis) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mitarbeiter, Projekt, Von und Bis sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const einsatzCollection = db.collection<Einsatz>('einsaetze')
    
    const { _id, ...updateData } = body
    
    const result = await einsatzCollection.updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: {
          ...updateData,
          zuletztGeaendert: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Einsatz nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Einsatz erfolgreich aktualisiert'
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Einsatzes:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren des Einsatzes' },
      { status: 500 }
    )
  }
}

// DELETE - Einsatz löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase()
    const einsatzCollection = db.collection<Einsatz>('einsaetze')
    
    const result = await einsatzCollection.deleteOne({ 
      _id: new ObjectId(params.id) 
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Einsatz nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Einsatz erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Einsatzes:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Einsatzes' },
      { status: 500 }
    )
  }
}

