import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const rechnungenCollection = db.collection('rechnungen')

    // Aktuelles Jahr
    const jahr = new Date().getFullYear()
    const prefix = `R-${jahr}-`

    // Letzte Rechnungsnummer dieses Jahres finden
    const letzteRechnung = await rechnungenCollection
      .find({ rechnungsnummer: { $regex: `^${prefix}` } })
      .sort({ rechnungsnummer: -1 })
      .limit(1)
      .toArray()

    let naechsteNummer = 1

    if (letzteRechnung.length > 0) {
      const letzteNummer = letzteRechnung[0].rechnungsnummer
      const nummerTeil = letzteNummer.replace(prefix, '')
      const aktuelleNummer = parseInt(nummerTeil, 10)
      
      if (!isNaN(aktuelleNummer)) {
        naechsteNummer = aktuelleNummer + 1
      }
    }

    const rechnungsnummer = `${prefix}${String(naechsteNummer).padStart(4, '0')}`

    return NextResponse.json({
      erfolg: true,
      rechnungsnummer,
      jahr,
      laufendeNummer: naechsteNummer
    })
  } catch (error) {
    console.error('Fehler beim Generieren der Rechnungsnummer:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Generieren der Rechnungsnummer' },
      { status: 500 }
    )
  }
}
