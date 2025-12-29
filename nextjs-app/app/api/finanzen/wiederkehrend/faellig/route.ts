import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { WiederkehrendeBuchung } from '@/lib/db/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mandantId = searchParams.get('mandantId')
    
    const db = await getDatabase()
    const collection = db.collection<WiederkehrendeBuchung>('wiederkehrende_buchungen')
    
    const heute = new Date()
    
    const filter: any = {
      aktiv: true,
      naechstesFaelligkeitsdatum: { $lte: heute }
    }
    if (mandantId) filter.mandantId = mandantId
    
    const faelligeBuchungen = await collection
      .find(filter)
      .sort({ naechstesFaelligkeitsdatum: 1 })
      .limit(10) // Max. 10 fällige Buchungen
      .toArray()
    
    return NextResponse.json({ erfolg: true, buchungen: faelligeBuchungen })
  } catch (error) {
    console.error('Fehler beim Laden der fälligen Buchungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der fälligen Buchungen' },
      { status: 500 }
    )
  }
}

