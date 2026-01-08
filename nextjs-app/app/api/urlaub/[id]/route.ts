import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Urlaub } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

// GET - Einzelnen Urlaubseintrag abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const urlaubCollection = db.collection<Urlaub>('urlaub')
    
    const urlaub = await urlaubCollection.findOne({ _id: new ObjectId(id) })
    
    if (!urlaub) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Urlaubseintrag nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ erfolg: true, urlaub })
  } catch (error) {
    console.error('Fehler beim Abrufen des Urlaubseintrags:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen des Urlaubseintrags' },
      { status: 500 }
    )
  }
}

// PUT - Urlaubseintrag aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    if (!body.von || !body.bis) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Von und Bis sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const urlaubCollection = db.collection<Urlaub>('urlaub')
    
    // Update-Daten vorbereiten
    const updateData = {
      ...body,
      zuletztGeaendert: new Date()
    }
    
    // _id nicht mit updaten
    delete updateData._id
    
    const result = await urlaubCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Urlaubseintrag nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Aktualisierten Eintrag abrufen
    const updatedUrlaub = await urlaubCollection.findOne({ _id: new ObjectId(id) })
    
    return NextResponse.json({ 
      erfolg: true, 
      urlaub: updatedUrlaub 
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Urlaubseintrags:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren des Urlaubseintrags' },
      { status: 500 }
    )
  }
}

// DELETE - Urlaubseintrag löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const urlaubCollection = db.collection<Urlaub>('urlaub')
    
    const result = await urlaubCollection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Urlaubseintrag nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true, 
      nachricht: 'Urlaubseintrag erfolgreich gelöscht' 
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Urlaubseintrags:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Urlaubseintrags' },
      { status: 500 }
    )
  }
}
