import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Mitarbeiter } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

// GET - Einzelnen Mitarbeiter abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    const mitarbeiter = await mitarbeiterCollection.findOne({ 
      _id: new ObjectId(params.id) 
    })
    
    if (!mitarbeiter) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true, 
      mitarbeiter 
    })
  } catch (error) {
    console.error('Fehler beim Abrufen des Mitarbeiters:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen des Mitarbeiters' },
      { status: 500 }
    )
  }
}

// PUT - Mitarbeiter aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Validierung
    if (!body.vorname || !body.nachname || !body.email) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Vorname, Nachname und E-Mail sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    // Prüfen ob E-Mail bereits von einem anderen Mitarbeiter verwendet wird
    const existing = await mitarbeiterCollection.findOne({ 
      email: body.email,
      _id: { $ne: new ObjectId(params.id) }
    })
    
    if (existing) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ein anderer Mitarbeiter verwendet bereits diese E-Mail' },
        { status: 400 }
      )
    }

    const { _id, ...updateData } = body
    
    const result = await mitarbeiterCollection.updateOne(
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
        { erfolg: false, fehler: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Mitarbeiter erfolgreich aktualisiert'
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Mitarbeiters:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren des Mitarbeiters' },
      { status: 500 }
    )
  }
}

// DELETE - Mitarbeiter löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    const result = await mitarbeiterCollection.deleteOne({ 
      _id: new ObjectId(params.id) 
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Mitarbeiter erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Mitarbeiters:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Mitarbeiters' },
      { status: 500 }
    )
  }
}

