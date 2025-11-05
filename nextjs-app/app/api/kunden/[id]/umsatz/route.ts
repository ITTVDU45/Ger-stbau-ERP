import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

// GET - Umsatz-Statistiken eines Kunden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    // Monatlicher Umsatz der letzten 12 Monate
    const vor12Monaten = new Date()
    vor12Monaten.setMonth(vor12Monaten.getMonth() - 12)
    
    const monatlicherUmsatz = await db.collection('rechnungen').aggregate([
      {
        $match: {
          kundeId: id,
          status: 'bezahlt',
          bezahltAm: { $gte: vor12Monaten }
        }
      },
      {
        $group: {
          _id: {
            jahr: { $year: '$bezahltAm' },
            monat: { $month: '$bezahltAm' }
          },
          umsatz: { $sum: '$brutto' },
          anzahl: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.jahr': 1, '_id.monat': 1 }
      }
    ]).toArray()

    // Formatieren für Chart
    const chartData = monatlicherUmsatz.map(m => ({
      monat: `${m._id.monat}/${m._id.jahr}`,
      umsatz: m.umsatz,
      anzahlRechnungen: m.anzahl
    }))

    // Gesamt-Statistiken
    const gesamtUmsatz = monatlicherUmsatz.reduce((sum, m) => sum + m.umsatz, 0)
    const durchschnittProMonat = monatlicherUmsatz.length > 0 ? gesamtUmsatz / monatlicherUmsatz.length : 0

    return NextResponse.json({ 
      erfolg: true, 
      chartData,
      statistiken: {
        gesamtUmsatz12Monate: gesamtUmsatz,
        durchschnittProMonat,
        anzahlRechnungen: monatlicherUmsatz.reduce((sum, m) => sum + m.anzahl, 0)
      }
    })
  } catch (error) {
    console.error('Fehler beim Abrufen der Umsatz-Statistiken:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Umsatz-Statistiken' },
      { status: 500 }
    )
  }
}

