import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { KundenberichtStats, ZeitraumFilter } from '@/lib/db/types'
import { startOfDay, endOfDay, subDays, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subYears, subQuarters } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const zeitraumTyp = searchParams.get('zeitraumTyp') || 'aktuelles_jahr'
    const von = searchParams.get('von')
    const bis = searchParams.get('bis')

    console.log('[KundenBerichte Stats] Lade Statistiken für Zeitraum:', zeitraumTyp)

    // Berechne Zeitraum basierend auf Typ
    const { vonDate, bisDate } = berechneDateumBereich(zeitraumTyp as ZeitraumFilter['typ'], von, bis)

    const db = await getDatabase()
    const kundenCollection = db.collection('kunden')
    const rechnungenCollection = db.collection('rechnungen')
    const mahnungenCollection = db.collection('mahnungen')
    const projekteCollection = db.collection('projekte')
    const angeboteCollection = db.collection('angebote')
    const anfragenCollection = db.collection('anfragen')

    const now = new Date()
    const vor90Tagen = subDays(now, 90)

    // 1. Aktive Kunden (mit Aktivität im Zeitraum)
    const aktiveProjekte = await projekteCollection.distinct('kundeId', {
      zuletztGeaendert: { $gte: vonDate, $lte: bisDate }
    })
    const aktiveAngebote = await angeboteCollection.distinct('kundeId', {
      datum: { $gte: vonDate, $lte: bisDate }
    })
    const aktiveRechnungen = await rechnungenCollection.distinct('kundeId', {
      rechnungsdatum: { $gte: vonDate, $lte: bisDate }
    })
    const aktiveAnfragen = await anfragenCollection.distinct('kundeId', {
      erstelltAm: { $gte: vonDate, $lte: bisDate }
    })

    const aktiveKundenSet = new Set([
      ...aktiveProjekte,
      ...aktiveAngebote,
      ...aktiveRechnungen,
      ...aktiveAnfragen
    ])
    const aktiveKunden = aktiveKundenSet.size

    // 2. Kunden mit offenen Rechnungen
    const kundenMitOffenenRechnungenIds = await rechnungenCollection.distinct('kundeId', {
      status: { $in: ['offen', 'ueberfaellig', 'teilweise_bezahlt'] }
    })
    const kundenMitOffenenRechnungen = kundenMitOffenenRechnungenIds.length

    // 3. Kunden mit offener Mahnung
    const kundenMitOffenerMahnungIds = await mahnungenCollection.distinct('kundeId', {
      status: { $in: ['erstellt', 'zur_genehmigung', 'genehmigt', 'versendet'] }
    })
    const kundenMitOffenerMahnung = kundenMitOffenerMahnungIds.length

    // 4. Gesamtumsatz im Zeitraum (bezahlte Rechnungen)
    const umsatzAggregation = await rechnungenCollection.aggregate([
      {
        $match: {
          rechnungsdatum: { $gte: vonDate, $lte: bisDate },
          status: 'bezahlt'
        }
      },
      {
        $group: {
          _id: null,
          gesamtumsatz: { $sum: '$brutto' }
        }
      }
    ]).toArray()
    const gesamtumsatzImZeitraum = umsatzAggregation[0]?.gesamtumsatz || 0

    // 5. Durchschnittliche Zahlungsdauer
    const zahlungsdauerAggregation = await rechnungenCollection.aggregate([
      {
        $match: {
          status: 'bezahlt',
          bezahltAm: { $exists: true },
          rechnungsdatum: { $exists: true }
        }
      },
      {
        $addFields: {
          zahlungsdauer: {
            $divide: [
              { $subtract: ['$bezahltAm', '$rechnungsdatum'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          durchschnitt: { $avg: '$zahlungsdauer' }
        }
      }
    ]).toArray()
    const durchschnittlicheZahlungsdauer = Math.round(zahlungsdauerAggregation[0]?.durchschnitt || 0)

    // 6. Kunden ohne Aktivität (90 Tage)
    // Suche nach Kunden, die in den letzten 90 Tagen keine Aktivität hatten
    const alleKunden = await kundenCollection.find({}).toArray()
    let kundenOhneAktivitaet90Tage = 0

    for (const kunde of alleKunden) {
      const kundeId = kunde._id!.toString()
      
      // Prüfe alle Aktivitäten parallel
      const [hatProjekt, hatAngebot, hatRechnung, hatAnfrage] = await Promise.all([
        projekteCollection.findOne({ kundeId, zuletztGeaendert: { $gte: vor90Tagen } }),
        angeboteCollection.findOne({ kundeId, datum: { $gte: vor90Tagen } }),
        rechnungenCollection.findOne({ kundeId, rechnungsdatum: { $gte: vor90Tagen } }),
        anfragenCollection.findOne({ kundeId, erstelltAm: { $gte: vor90Tagen } })
      ])

      const hatAktivitaet = hatProjekt || hatAngebot || hatRechnung || hatAnfrage

      if (!hatAktivitaet) {
        kundenOhneAktivitaet90Tage++
      }
    }

    // 7. Top 5 Kunden nach Umsatz im Zeitraum
    const topKundenAggregation = await rechnungenCollection.aggregate([
      {
        $match: {
          rechnungsdatum: { $gte: vonDate, $lte: bisDate },
          status: 'bezahlt'
        }
      },
      {
        $group: {
          _id: '$kundeId',
          kundeName: { $first: '$kundeName' },
          umsatz: { $sum: '$brutto' }
        }
      },
      {
        $sort: { umsatz: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          kundeId: '$_id',
          kundeName: 1,
          umsatz: 1,
          _id: 0
        }
      }
    ]).toArray()

    const stats: KundenberichtStats = {
      aktiveKunden,
      kundenMitOffenenRechnungen,
      kundenMitOffenerMahnung,
      gesamtumsatzImZeitraum,
      durchschnittlicheZahlungsdauer,
      kundenOhneAktivitaet90Tage,
      topKunden: topKundenAggregation
    }

    return NextResponse.json({ erfolg: true, stats })
  } catch (error) {
    console.error('Fehler beim Laden der Kundenstatistiken:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Kundenstatistiken', details: errorMessage },
      { status: 500 }
    )
  }
}

function berechneDateumBereich(
  typ: ZeitraumFilter['typ'],
  vonParam?: string | null,
  bisParam?: string | null
): { vonDate: Date; bisDate: Date } {
  const now = new Date()

  if (typ === 'benutzerdefiniert' && vonParam && bisParam) {
    return {
      vonDate: startOfDay(new Date(vonParam)),
      bisDate: endOfDay(new Date(bisParam))
    }
  }

  switch (typ) {
    case 'all':
      return {
        vonDate: new Date('2000-01-01'), // Weit in der Vergangenheit für "alle Daten"
        bisDate: endOfDay(now)
      }
    case 'letzte_30_tage':
      return {
        vonDate: startOfDay(subDays(now, 30)),
        bisDate: endOfDay(now)
      }
    case 'letzte_90_tage':
      return {
        vonDate: startOfDay(subDays(now, 90)),
        bisDate: endOfDay(now)
      }
    case 'letztes_jahr':
      return {
        vonDate: startOfDay(subDays(now, 365)),
        bisDate: endOfDay(now)
      }
    case 'aktuelles_jahr':
      return {
        vonDate: startOfYear(now),
        bisDate: endOfYear(now)
      }
    case 'aktuelles_quartal':
      return {
        vonDate: startOfQuarter(now),
        bisDate: endOfQuarter(now)
      }
    case 'vorjahr':
      const letzesJahr = subYears(now, 1)
      return {
        vonDate: startOfYear(letzesJahr),
        bisDate: endOfYear(letzesJahr)
      }
    case 'letztes_quartal':
      const letztesQuartal = subQuarters(now, 1)
      return {
        vonDate: startOfQuarter(letztesQuartal),
        bisDate: endOfQuarter(letztesQuartal)
      }
    default:
      return {
        vonDate: startOfYear(now),
        bisDate: endOfYear(now)
      }
  }
}

