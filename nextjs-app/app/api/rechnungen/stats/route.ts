import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Rechnung, Mahnung } from '@/lib/db/types'

/**
 * GET /api/rechnungen/stats
 * 
 * Liefert Statistiken für die Rechnungen-Übersicht KPI-Cards
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const rechnungenCollection = db.collection<Rechnung>('rechnungen')
    const mahnungenCollection = db.collection<Mahnung>('mahnungen')

    const now = new Date()

    // Alle Rechnungen abrufen (außer Entwürfe)
    const alleRechnungen = await rechnungenCollection.find({
      status: { $ne: 'entwurf' }
    }).toArray()

    // Offene Mahnungen abrufen
    const offeneMahnungen = await mahnungenCollection.find({
      status: { $in: ['zur_genehmigung', 'genehmigt', 'versendet'] }
    }).toArray()

    // Map für schnellen Zugriff: rechnungId -> hat offene Mahnung
    const rechnungenMitMahnungSet = new Set(
      offeneMahnungen.map(m => m.rechnungId)
    )

    // Statistiken berechnen
    let offeneRechnungen = 0
    let ueberfaelligeRechnungen = 0
    let bezahlteRechnungen = 0
    let rechnungenMitMahnung = 0
    let rechnungenOhneMahnung = 0
    let summeOffen = 0
    let summeBezahlt = 0
    let summeUeberfaellig = 0

    alleRechnungen.forEach(rechnung => {
      const istUeberfaellig = rechnung.faelligAm && new Date(rechnung.faelligAm) < now && rechnung.status !== 'bezahlt'
      const hatOffeneMahnung = rechnungenMitMahnungSet.has(rechnung._id!.toString())

      // Status-Zähler
      if (rechnung.status === 'bezahlt') {
        bezahlteRechnungen++
        summeBezahlt += rechnung.brutto
      } else if (rechnung.status !== 'storniert') {
        offeneRechnungen++
        
        // Offenen Betrag berechnen
        let offenerBetrag = rechnung.brutto
        if (rechnung.status === 'teilweise_bezahlt' && rechnung.bezahltBetrag) {
          offenerBetrag = rechnung.brutto - rechnung.bezahltBetrag
        }
        summeOffen += offenerBetrag

        // Überfällig?
        if (istUeberfaellig) {
          ueberfaelligeRechnungen++
          summeUeberfaellig += offenerBetrag
        }

        // Mit/ohne Mahnung
        if (hatOffeneMahnung) {
          rechnungenMitMahnung++
        } else if (istUeberfaellig) {
          // Nur überfällige Rechnungen ohne Mahnung zählen
          rechnungenOhneMahnung++
        }
      }
    })

    const stats = {
      offeneRechnungen,
      ueberfaelligeRechnungen,
      bezahlteRechnungen,
      rechnungenMitMahnung,
      rechnungenOhneMahnung, // Überfällig aber noch nicht gemahnt
      summeOffen,
      summeBezahlt,
      summeUeberfaellig
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnungsstatistiken:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

