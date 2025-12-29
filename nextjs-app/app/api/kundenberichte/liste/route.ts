import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ZeitraumFilter, KundenKennzahlen } from '@/lib/db/types'
import { startOfMonth, endOfMonth, subDays, subMonths, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subQuarters } from 'date-fns'

// Hilfsfunktion: Zeitraum-Filter zu Date-Range konvertieren
function getDateRangeFromFilter(filter: ZeitraumFilter): { von: Date; bis: Date } {
  const now = new Date()
  
  switch (filter.typ) {
    case 'letzte_30_tage':
      return { von: subDays(now, 30), bis: now }
    case 'letzte_90_tage':
      return { von: subDays(now, 90), bis: now }
    case 'letztes_jahr':
      return { von: subDays(now, 365), bis: now }
    case 'aktuelles_jahr':
      return { von: startOfYear(now), bis: endOfYear(now) }
    case 'aktuelles_quartal':
      return { von: startOfQuarter(now), bis: endOfQuarter(now) }
    case 'vorjahr':
      const lastYear = subMonths(now, 12)
      return { von: startOfYear(lastYear), bis: endOfYear(lastYear) }
    case 'letztes_quartal':
      const lastQuarter = subQuarters(now, 1)
      return { von: startOfQuarter(lastQuarter), bis: endOfQuarter(lastQuarter) }
    case 'benutzerdefiniert':
      if (!filter.von || !filter.bis) {
        throw new Error('Benutzerdefinierter Zeitraum erfordert von und bis Datum')
      }
      return { von: new Date(filter.von), bis: new Date(filter.bis) }
    default:
      return { von: subDays(now, 30), bis: now }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Zeitraum-Filter aus Query-Parametern
    const filterTyp = searchParams.get('filterTyp') || 'letzte_30_tage'
    const vonParam = searchParams.get('von')
    const bisParam = searchParams.get('bis')
    
    const zeitraumFilter: ZeitraumFilter = {
      typ: filterTyp as any,
      von: vonParam ? new Date(vonParam) : undefined,
      bis: bisParam ? new Date(bisParam) : undefined
    }
    
    const { von, bis } = getDateRangeFromFilter(zeitraumFilter)
    
    const db = await getDatabase()
    
    // Aggregation Pipeline für Kundenliste mit Kennzahlen
    const kunden = await db.collection('kunden').aggregate([
      {
        $match: {
          aktiv: true // Nur aktive Kunden
        }
      },
      // Projekte zählen
      {
        $lookup: {
          from: 'projekte',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] }
              }
            }
          ],
          as: 'projekte'
        }
      },
      // Angebote zählen
      {
        $lookup: {
          from: 'angebote',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] }
              }
            }
          ],
          as: 'angebote'
        }
      },
      // Anfragen zählen
      {
        $lookup: {
          from: 'anfragen',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] }
              }
            }
          ],
          as: 'anfragen'
        }
      },
      // Rechnungen (offen)
      {
        $lookup: {
          from: 'rechnungen',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] },
                status: { $in: ['offen', 'ueberfaellig', 'teilweise_bezahlt'] }
              }
            }
          ],
          as: 'rechnungenOffen'
        }
      },
      // Rechnungen (bezahlt)
      {
        $lookup: {
          from: 'rechnungen',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] },
                status: 'bezahlt'
              }
            }
          ],
          as: 'rechnungenBezahlt'
        }
      },
      // Mahnungen (offen)
      {
        $lookup: {
          from: 'mahnungen',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] },
                status: { $in: ['zur_genehmigung', 'genehmigt', 'versendet'] }
              }
            }
          ],
          as: 'mahnungenOffen'
        }
      },
      // Umsatz im Zeitraum
      {
        $lookup: {
          from: 'rechnungen',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] },
                status: 'bezahlt',
                rechnungsdatum: { $gte: von, $lte: bis }
              }
            },
            {
              $group: {
                _id: null,
                umsatz: { $sum: '$brutto' }
              }
            }
          ],
          as: 'umsatzImZeitraum'
        }
      },
      // Letzte Aktivität (aus Projekten, Angeboten, Rechnungen)
      {
        $lookup: {
          from: 'projekte',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] }
              }
            },
            { $sort: { erstelltAm: -1 } },
            { $limit: 1 },
            { $project: { erstelltAm: 1 } }
          ],
          as: 'letztesProjekt'
        }
      },
      {
        $lookup: {
          from: 'angebote',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] }
              }
            },
            { $sort: { erstelltAm: -1 } },
            { $limit: 1 },
            { $project: { erstelltAm: 1 } }
          ],
          as: 'letztesAngebot'
        }
      },
      {
        $lookup: {
          from: 'rechnungen',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] }
              }
            },
            { $sort: { rechnungsdatum: -1 } },
            { $limit: 1 },
            { $project: { rechnungsdatum: 1 } }
          ],
          as: 'letzteRechnung'
        }
      },
      // Projizieren der finalen Kennzahlen
      {
        $project: {
          kundeId: { $toString: '$_id' },
          kundennummer: { $ifNull: ['$kundennummer', ''] },
          kundeName: {
            $cond: {
              if: { $gt: [{ $strLenCP: { $ifNull: ['$firma', ''] } }, 0] },
              then: '$firma',
              else: {
                $concat: [
                  { $ifNull: ['$vorname', ''] },
                  ' ',
                  { $ifNull: ['$nachname', ''] }
                ]
              }
            }
          },
          firma: '$firma',
          ansprechpartner: {
            $cond: {
              if: { $gt: ['$ansprechpartner', null] },
              then: {
                $concat: [
                  { $ifNull: ['$ansprechpartner.vorname', ''] },
                  ' ',
                  { $ifNull: ['$ansprechpartner.nachname', ''] }
                ]
              },
              else: ''
            }
          },
          anzahlProjekte: { $size: '$projekte' },
          anzahlAngebote: { $size: '$angebote' },
          anzahlAnfragen: { $size: '$anfragen' },
          rechnungenOffen: { $size: '$rechnungenOffen' },
          rechnungenBezahlt: { $size: '$rechnungenBezahlt' },
          offenerBetrag: {
            $reduce: {
              input: '$rechnungenOffen',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.brutto'] }
            }
          },
          mahnungenOffen: { $size: '$mahnungenOffen' },
          umsatzImZeitraum: {
            $ifNull: [{ $arrayElemAt: ['$umsatzImZeitraum.umsatz', 0] }, 0]
          },
          letzteAktivitaet: {
            $max: [
              { $ifNull: [{ $arrayElemAt: ['$letztesProjekt.erstelltAm', 0] }, new Date(0)] },
              { $ifNull: [{ $arrayElemAt: ['$letztesAngebot.erstelltAm', 0] }, new Date(0)] },
              { $ifNull: [{ $arrayElemAt: ['$letzteRechnung.rechnungsdatum', 0] }, new Date(0)] }
            ]
          },
          status: {
            $cond: {
              if: { $eq: ['$aktiv', false] },
              then: 'inaktiv',
              else: {
                $cond: {
                  if: { $eq: ['$mahnwesen.mahnung_erlaubt', false] },
                  then: 'mahnsperre',
                  else: 'aktiv'
                }
              }
            }
          },
          kategorisierung: { $ifNull: ['$kategorisierung', null] }
        }
      },
      { $sort: { kundeName: 1 } }
    ]).toArray()
    
    return NextResponse.json({ erfolg: true, kunden: kunden as KundenKennzahlen[] })
  } catch (error) {
    console.error('Fehler beim Abrufen der Kundenliste:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Kundenliste' },
      { status: 500 }
    )
  }
}

