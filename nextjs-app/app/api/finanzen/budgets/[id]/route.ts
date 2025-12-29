import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Budget } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Budget-ID' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const collection = db.collection<Budget>('budgets')
    
    const budget = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!budget) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Budget nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ erfolg: true, budget })
  } catch (error) {
    console.error('Fehler beim Laden des Budgets:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden des Budgets' },
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
        { erfolg: false, fehler: 'Ungültige Budget-ID' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
    const db = await getDatabase()
    const collection = db.collection<Budget>('budgets')
    
    const updateData = {
      ...body,
      zuletztGeaendert: new Date()
    }
    
    // Verhindere Änderung bestimmter Felder
    delete updateData._id
    delete updateData.erstelltAm
    
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Budget nicht gefunden' },
        { status: 404 }
      )
    }
    
    const budget = await collection.findOne({ _id: new ObjectId(id) })
    
    return NextResponse.json({ erfolg: true, budget })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Budgets:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren des Budgets' },
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
        { erfolg: false, fehler: 'Ungültige Budget-ID' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const collection = db.collection<Budget>('budgets')
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Budget nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ erfolg: true })
  } catch (error) {
    console.error('Fehler beim Löschen des Budgets:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Budgets' },
      { status: 500 }
    )
  }
}

