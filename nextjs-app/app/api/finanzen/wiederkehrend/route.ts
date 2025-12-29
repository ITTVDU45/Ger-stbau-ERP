import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { WiederkehrendeBuchung } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mandantId = searchParams.get('mandantId')
    const aktiv = searchParams.get('aktiv') // 'true' oder 'false'
    
    const db = await getDatabase()
    const collection = db.collection<WiederkehrendeBuchung>('wiederkehrende_buchungen')
    
    const filter: any = {}
    if (mandantId) filter.mandantId = mandantId
    if (aktiv) filter.aktiv = aktiv === 'true'
    
    const buchungen = await collection
      .find(filter)
      .sort({ naechstesFaelligkeitsdatum: 1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, buchungen })
  } catch (error) {
    console.error('Fehler beim Laden der wiederkehrenden Buchungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der wiederkehrenden Buchungen' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const db = await getDatabase()
    const collection = db.collection<WiederkehrendeBuchung>('wiederkehrende_buchungen')
    
    const neueBuchung: WiederkehrendeBuchung = {
      ...body,
      aktiv: body.aktiv !== undefined ? body.aktiv : true,
      erinnerungAngezeigt: false,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await collection.insertOne(neueBuchung)
    const buchung = await collection.findOne({ _id: result.insertedId })
    
    return NextResponse.json({ erfolg: true, buchung }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Erstellen der wiederkehrenden Buchung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Erstellen der wiederkehrenden Buchung' },
      { status: 500 }
    )
  }
}

