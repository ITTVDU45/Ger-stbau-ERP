import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

/**
 * GET /api/mahnwesen/reports
 * Liefert Reports und Analytics-Daten für das Mahnwesen
 */
export async function GET() {
  try {
    const db = await getDatabase()
    const mahnungenCollection = db.collection('mahnungen')
    const rechnungenCollection = db.collection('rechnungen')

    const heute = new Date()
    const startOfCurrentMonth = startOfMonth(heute)
    const endOfCurrentMonth = endOfMonth(heute)

    // Letzte 6 Monate für Trends
    const months = []
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(heute, i)
      months.push({
        start: startOfMonth(date),
        end: endOfMonth(date),
        label: format(date, 'MMM yyyy')
      })
    }

    // 1. Mahnungen pro Mahnstufe
    const mahnungenProMahnstufe = await mahnungenCollection
      .aggregate([
        {
          $group: {
            _id: '$mahnstufe',
            anzahl: { $count: {} },
            gesamtforderung: { $sum: '$gesamtforderung' }
          }
        },
        { $sort: { _id: 1 } }
      ])
      .toArray()

    // 2. Erfolgsrate (bezahlte Mahnungen)
    const [bezahlteMahnungen, alleMahnungen] = await Promise.all([
      mahnungenCollection.countDocuments({ status: 'bezahlt' }),
      mahnungenCollection.countDocuments()
    ])

    const erfolgsrate = alleMahnungen > 0 ? (bezahlteMahnungen / alleMahnungen) * 100 : 0

    // 3. Durchschnittliche Zahlungsdauer nach Mahnung
    const bezahlteMahnungenDetails = await mahnungenCollection
      .find({
        status: 'bezahlt',
        versandtAm: { $exists: true }
      })
      .toArray()

    let durchschnittlicheZahlungsdauer = 0
    if (bezahlteMahnungenDetails.length > 0) {
      const summe = bezahlteMahnungenDetails.reduce((acc, m) => {
        if (m.versandtAm && m.datum) {
          const tage = Math.floor(
            (new Date(m.datum).getTime() - new Date(m.versandtAm).getTime()) /
              (1000 * 60 * 60 * 24)
          )
          return acc + Math.abs(tage)
        }
        return acc
      }, 0)
      durchschnittlicheZahlungsdauer = Math.round(summe / bezahlteMahnungenDetails.length)
    }

    // 4. Mahnungen-Trend (letzte 6 Monate)
    const mahnungenTrend = await Promise.all(
      months.map(async (month) => {
        const anzahl = await mahnungenCollection.countDocuments({
          erstelltAm: { $gte: month.start, $lte: month.end }
        })
        const versendet = await mahnungenCollection.countDocuments({
          versandtAm: { $gte: month.start, $lte: month.end }
        })
        const bezahlt = await mahnungenCollection.countDocuments({
          status: 'bezahlt',
          datum: { $gte: month.start, $lte: month.end }
        })
        return {
          monat: month.label,
          erstellt: anzahl,
          versendet,
          bezahlt
        }
      })
    )

    // 5. Top 10 Kunden mit häufigsten Mahnungen
    const topKunden = await mahnungenCollection
      .aggregate([
        {
          $group: {
            _id: '$kundeId',
            kundeName: { $first: '$kundeName' },
            anzahlMahnungen: { $count: {} },
            gesamtforderung: { $sum: '$gesamtforderung' }
          }
        },
        { $sort: { anzahlMahnungen: -1 } },
        { $limit: 10 }
      ])
      .toArray()

    // 6. Mahngebühren & Verzugszinsen (aktueller Monat)
    const gebuehrenResult = await mahnungenCollection
      .aggregate([
        {
          $match: {
            erstelltAm: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
          }
        },
        {
          $group: {
            _id: null,
            gesamtMahngebuehren: { $sum: '$mahngebuehren' },
            gesamtVerzugszinsen: { $sum: { $ifNull: ['$verzugszinsen', 0] } }
          }
        }
      ])
      .toArray()

    const gebuehren = gebuehrenResult[0] || {
      gesamtMahngebuehren: 0,
      gesamtVerzugszinsen: 0
    }

    // 7. Status-Verteilung
    const statusVerteilung = await mahnungenCollection
      .aggregate([
        {
          $group: {
            _id: '$status',
            anzahl: { $count: {} }
          }
        }
      ])
      .toArray()

    // 8. Durchschnittliche Bearbeitungszeit (Erstellung bis Versand)
    const versendeteDetails = await mahnungenCollection
      .find({
        status: { $in: ['versendet', 'bezahlt'] },
        erstelltAm: { $exists: true },
        versandtAm: { $exists: true }
      })
      .toArray()

    let durchschnittlicheBearbeitungszeit = 0
    if (versendeteDetails.length > 0) {
      const summe = versendeteDetails.reduce((acc, m) => {
        if (m.erstelltAm && m.versandtAm) {
          const stunden = Math.floor(
            (new Date(m.versandtAm).getTime() - new Date(m.erstelltAm).getTime()) /
              (1000 * 60 * 60)
          )
          return acc + Math.abs(stunden)
        }
        return acc
      }, 0)
      durchschnittlicheBearbeitungszeit = Math.round(summe / versendeteDetails.length)
    }

    // 9. Offene Forderungen nach Alter
    const heute_time = heute.getTime()
    const offeneMahnungen = await mahnungenCollection
      .find({
        status: { $in: ['versendet', 'genehmigt'] }
      })
      .toArray()

    const forderungenNachAlter = {
      unter30Tage: { anzahl: 0, betrag: 0 },
      '30bis60Tage': { anzahl: 0, betrag: 0 },
      '60bis90Tage': { anzahl: 0, betrag: 0 },
      ueber90Tage: { anzahl: 0, betrag: 0 }
    }

    offeneMahnungen.forEach((m) => {
      const tage = Math.floor(
        (heute_time - new Date(m.faelligAm).getTime()) / (1000 * 60 * 60 * 24)
      )
      const betrag = m.gesamtforderung

      if (tage < 30) {
        forderungenNachAlter.unter30Tage.anzahl++
        forderungenNachAlter.unter30Tage.betrag += betrag
      } else if (tage < 60) {
        forderungenNachAlter['30bis60Tage'].anzahl++
        forderungenNachAlter['30bis60Tage'].betrag += betrag
      } else if (tage < 90) {
        forderungenNachAlter['60bis90Tage'].anzahl++
        forderungenNachAlter['60bis90Tage'].betrag += betrag
      } else {
        forderungenNachAlter.ueber90Tage.anzahl++
        forderungenNachAlter.ueber90Tage.betrag += betrag
      }
    })

    return NextResponse.json(
      {
        erfolg: true,
        reports: {
          mahnungenProMahnstufe,
          erfolgsrate: Math.round(erfolgsrate * 10) / 10,
          durchschnittlicheZahlungsdauer,
          durchschnittlicheBearbeitungszeit,
          mahnungenTrend,
          topKunden,
          gebuehren: {
            gesamtMahngebuehren: gebuehren.gesamtMahngebuehren,
            gesamtVerzugszinsen: gebuehren.gesamtVerzugszinsen,
            gesamt:
              gebuehren.gesamtMahngebuehren + gebuehren.gesamtVerzugszinsen
          },
          statusVerteilung,
          forderungenNachAlter
        }
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' // 10 Minuten Cache
        }
      }
    )
  } catch (error) {
    console.error('[GET /api/mahnwesen/reports] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

