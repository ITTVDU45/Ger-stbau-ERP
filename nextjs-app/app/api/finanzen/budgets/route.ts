import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Budget } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mandantId = searchParams.get('mandantId')
    const aktiv = searchParams.get('aktiv')
    
    const db = await getDatabase()
    const collection = db.collection<Budget>('budgets')
    
    const filter: any = {}
    if (mandantId) filter.mandantId = mandantId
    if (aktiv) filter.aktiv = aktiv === 'true'
    
    const budgets = await collection
      .find(filter)
      .sort({ kategorieName: 1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, budgets })
  } catch (error) {
    console.error('Fehler beim Laden der Budgets:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Budgets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const db = await getDatabase()
    const collection = db.collection<Budget>('budgets')
    
    const neuesBudget: Budget = {
      ...body,
      aktiv: body.aktiv !== undefined ? body.aktiv : true,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await collection.insertOne(neuesBudget)
    const budget = await collection.findOne({ _id: result.insertedId })
    
    return NextResponse.json({ erfolg: true, budget }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Erstellen des Budgets:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Erstellen des Budgets' },
      { status: 500 }
    )
  }
}

