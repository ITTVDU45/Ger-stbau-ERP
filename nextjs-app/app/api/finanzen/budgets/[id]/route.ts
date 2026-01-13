import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Budget } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

// GET /api/finanzen/budgets/[id] - Einzelnes Budget abrufen
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

// PUT /api/finanzen/budgets/[id] - Budget aktualisieren
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
    
    // Aktualisiere das Budget
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...body,
          zuletztGeaendert: new Date()
        }
      }
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

// DELETE /api/finanzen/budgets/[id] - Budget löschen
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
    
    // Prüfe ob Budget existiert
    const existingBudget = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!existingBudget) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Budget nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Lösche das Budget
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Budget konnte nicht gelöscht werden' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true, 
      message: 'Budget erfolgreich gelöscht',
      budget: existingBudget
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Budgets:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Budgets' },
      { status: 500 }
    )
  }
}
