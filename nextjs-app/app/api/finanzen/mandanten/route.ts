import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Mandant } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const aktiv = searchParams.get('aktiv')
    
    const db = await getDatabase()
    const collection = db.collection<Mandant>('mandanten')
    
    const filter: any = {}
    if (aktiv) filter.aktiv = aktiv === 'true'
    
    const mandanten = await collection
      .find(filter)
      .sort({ name: 1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, mandanten })
  } catch (error) {
    console.error('Fehler beim Laden der Mandanten:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Mandanten' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const db = await getDatabase()
    const collection = db.collection<Mandant>('mandanten')
    
    const neuerMandant: Mandant = {
      ...body,
      aktiv: body.aktiv !== undefined ? body.aktiv : true,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await collection.insertOne(neuerMandant)
    const mandant = await collection.findOne({ _id: result.insertedId })
    
    return NextResponse.json({ erfolg: true, mandant }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Erstellen des Mandanten:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Erstellen des Mandanten' },
      { status: 500 }
    )
  }
}

