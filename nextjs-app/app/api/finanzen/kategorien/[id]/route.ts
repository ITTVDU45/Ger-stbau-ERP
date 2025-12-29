import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { FinanzenKategorie } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige ID' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const collection = db.collection<FinanzenKategorie>('finanzen_kategorien')
    
    const kategorie = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!kategorie) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kategorie nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ erfolg: true, kategorie })
  } catch (error) {
    console.error('Fehler beim Laden der Kategorie:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Kategorie' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige ID' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
    const db = await getDatabase()
    const collection = db.collection<FinanzenKategorie>('finanzen_kategorien')
    
    const updateData = {
      ...body,
      zuletztGeaendert: new Date()
    }
    
    delete updateData._id
    delete updateData.erstelltAm
    
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kategorie nicht gefunden' },
        { status: 404 }
      )
    }
    
    const kategorie = await collection.findOne({ _id: new ObjectId(id) })
    
    return NextResponse.json({ erfolg: true, kategorie })
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Kategorie:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren der Kategorie' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige ID' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const collection = db.collection<FinanzenKategorie>('finanzen_kategorien')
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kategorie nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ erfolg: true })
  } catch (error) {
    console.error('Fehler beim Löschen der Kategorie:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen der Kategorie' },
      { status: 500 }
    )
  }
}

