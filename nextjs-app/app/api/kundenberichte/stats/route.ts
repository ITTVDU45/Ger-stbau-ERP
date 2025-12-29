import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ZeitraumFilter } from '@/lib/db/types'
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
    
    // 1. Aktive Kunden (Kunden mit Aktivität im Zeitraum)
    const kundenMitAktivitaet = await db.collection('kunden').aggregate([
      {
        $lookup: {
          from: 'projekte',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] },
                erstelltAm: { $gte: von, $lte: bis }
              }
            }
          ],
          as: 'projekteImZeitraum'
        }
      },
      {
        $lookup: {
          from: 'angebote',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] },
                erstelltAm: { $gte: von, $lte: bis }
              }
            }
          ],
          as: 'angeboteImZeitraum'
        }
      },
      {
        $lookup: {
          from: 'rechnungen',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] },
                rechnungsdatum: { $gte: von, $lte: bis }
              }
            }
          ],
          as: 'rechnungenImZeitraum'
        }
      },
      {
        $match: {
          $or: [
            { 'projekteImZeitraum.0': { $exists: true } },
            { 'angeboteImZeitraum.0': { $exists: true } },
            { 'rechnungenImZeitraum.0': { $exists: true } }
          ]
        }
      },
      { $count: 'aktiveKunden' }
    ]).toArray()
    
    const aktiveKunden = kundenMitAktivitaet[0]?.aktiveKunden || 0
    
    // 2. Kunden mit offenen Rechnungen
    const kundenMitOffenenRechnungen = await db.collection('rechnungen').aggregate([
      {
        $match: {
          status: { $in: ['offen', 'ueberfaellig', 'teilweise_bezahlt'] }
        }
      },
      {
        $group: {
          _id: '$kundeId'
        }
      },
      { $count: 'count' }
    ]).toArray()
    
    // 3. Kunden mit offener Mahnung
    const kundenMitOffenerMahnung = await db.collection('mahnungen').aggregate([
      {
        $match: {
          status: { $in: ['zur_genehmigung', 'genehmigt', 'versendet'] }
        }
      },
      {
        $group: {
          _id: '$kundeId'
        }
      },
      { $count: 'count' }
    ]).toArray()
    
    // 4. Gesamtumsatz im Zeitraum (nur bezahlte Rechnungen)
    const umsatzResult = await db.collection('rechnungen').aggregate([
      {
        $match: {
          status: 'bezahlt',
          rechnungsdatum: { $gte: von, $lte: bis }
        }
      },
      {
        $group: {
          _id: null,
          gesamtumsatz: { $sum: '$brutto' }
        }
      }
    ]).toArray()
    
    const gesamtumsatzImZeitraum = umsatzResult[0]?.gesamtumsatz || 0
    
    // 5. Durchschnittliche Zahlungsdauer
    const zahlungsdauerResult = await db.collection('rechnungen').aggregate([
      {
        $match: {
          status: 'bezahlt',
          bezahltAm: { $exists: true },
          rechnungsdatum: { $gte: von, $lte: bis }
        }
      },
      {
        $addFields: {
          zahlungsdauer: {
            $divide: [
              { $subtract: ['$bezahltAm', '$rechnungsdatum'] },
              1000 * 60 * 60 * 24 // Millisekunden zu Tage
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
    
    const durchschnittlicheZahlungsdauer = Math.round(zahlungsdauerResult[0]?.durchschnitt || 0)
    
    // 6. Kunden ohne Aktivität in letzten 90 Tagen
    const vor90Tagen = subDays(new Date(), 90)
    const kundenOhneAktivitaet = await db.collection('kunden').aggregate([
      {
        $lookup: {
          from: 'projekte',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] },
                erstelltAm: { $gte: vor90Tagen }
              }
            }
          ],
          as: 'projekteLetzte90Tage'
        }
      },
      {
        $lookup: {
          from: 'angebote',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] },
                erstelltAm: { $gte: vor90Tagen }
              }
            }
          ],
          as: 'angeboteLetzte90Tage'
        }
      },
      {
        $lookup: {
          from: 'rechnungen',
          let: { kundeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$kundeId', '$$kundeId'] },
                rechnungsdatum: { $gte: vor90Tagen }
              }
            }
          ],
          as: 'rechnungenLetzte90Tage'
        }
      },
      {
        $match: {
          aktiv: true,
          'projekteLetzte90Tage.0': { $exists: false },
          'angeboteLetzte90Tage.0': { $exists: false },
          'rechnungenLetzte90Tage.0': { $exists: false }
        }
      },
      { $count: 'kundenOhneAktivitaet' }
    ]).toArray()
    
    const kundenOhneAktivitaet90Tage = kundenOhneAktivitaet[0]?.kundenOhneAktivitaet || 0
    
    // 7. Top 5 Kunden nach Umsatz im Zeitraum
    const topKunden = await db.collection('rechnungen').aggregate([
      {
        $match: {
          status: 'bezahlt',
          rechnungsdatum: { $gte: von, $lte: bis }
        }
      },
      {
        $group: {
          _id: '$kundeId',
          kundeName: { $first: '$kundeName' },
          umsatz: { $sum: '$brutto' }
        }
      },
      { $sort: { umsatz: -1 } },
      { $limit: 5 },
      {
        $project: {
          kundeId: '$_id',
          kundeName: 1,
          umsatz: 1,
          _id: 0
        }
      }
    ]).toArray()
    
    const stats = {
      aktiveKunden,
      kundenMitOffenenRechnungen: kundenMitOffenenRechnungen[0]?.count || 0,
      kundenMitOffenerMahnung: kundenMitOffenerMahnung[0]?.count || 0,
      gesamtumsatzImZeitraum,
      durchschnittlicheZahlungsdauer,
      kundenOhneAktivitaet90Tage,
      topKunden
    }
    
    return NextResponse.json({ erfolg: true, stats })
  } catch (error) {
    console.error('Fehler beim Abrufen der Kundenbericht-Stats:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Statistiken' },
      { status: 500 }
    )
  }
}

