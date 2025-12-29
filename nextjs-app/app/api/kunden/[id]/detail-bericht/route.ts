import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { KundenDetailBericht, Kunde } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { startOfDay, endOfDay, subDays, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subYears, subQuarters } from 'date-fns'

// GET - Detail-Bericht für einen Kunden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const zeitraumTyp = searchParams.get('zeitraumTyp') || 'aktuelles_jahr'
    const von = searchParams.get('von')
    const bis = searchParams.get('bis')

    // Berechne Zeitraum
    const { vonDate, bisDate } = berechneDateumBereich(zeitraumTyp as any, von, bis)

    const db = await getDatabase()
    const kundenCollection = db.collection<Kunde>('kunden')
    const anfragenCollection = db.collection('anfragen')
    const angeboteCollection = db.collection('angebote')
    const rechnungenCollection = db.collection('rechnungen')
    const mahnungenCollection = db.collection('mahnungen')
    const projekteCollection = db.collection('projekte')

    // Kunde laden
    const kunde = await kundenCollection.findOne({ _id: new ObjectId(id) })
    if (!kunde) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kunde nicht gefunden' },
        { status: 404 }
      )
    }

    // KPIs berechnen
    const anzahlAnfragen = await anfragenCollection.countDocuments({
      kundeId: id,
      erstelltAm: { $gte: vonDate, $lte: bisDate }
    })

    const angebotsvolumenAggr = await angeboteCollection.aggregate([
      {
        $match: {
          kundeId: id,
          datum: { $gte: vonDate, $lte: bisDate }
        }
      },
      {
        $group: {
          _id: null,
          summe: { $sum: '$brutto' }
        }
      }
    ]).toArray()
    const angebotsvolumen = angebotsvolumenAggr[0]?.summe || 0

    const rechnungsvolumenAggr = await rechnungenCollection.aggregate([
      {
        $match: {
          kundeId: id,
          rechnungsdatum: { $gte: vonDate, $lte: bisDate }
        }
      },
      {
        $group: {
          _id: null,
          summe: { $sum: '$brutto' }
        }
      }
    ]).toArray()
    const rechnungsvolumen = rechnungsvolumenAggr[0]?.summe || 0

    const offenerBetragAggr = await rechnungenCollection.aggregate([
      {
        $match: {
          kundeId: id,
          status: { $in: ['offen', 'ueberfaellig', 'teilweise_bezahlt'] }
        }
      },
      {
        $group: {
          _id: null,
          summe: { $sum: '$brutto' }
        }
      }
    ]).toArray()
    const offenerBetrag = offenerBetragAggr[0]?.summe || 0

    const mahnungenOffen = await mahnungenCollection.countDocuments({
      kundeId: id,
      status: { $in: ['erstellt', 'zur_genehmigung', 'genehmigt', 'versendet'] }
    })

    const gesamtRechnungen = await rechnungenCollection.countDocuments({
      kundeId: id,
      rechnungsdatum: { $gte: vonDate, $lte: bisDate }
    })

    const bezahlteRechnungen = await rechnungenCollection.countDocuments({
      kundeId: id,
      rechnungsdatum: { $gte: vonDate, $lte: bisDate },
      status: 'bezahlt'
    })

    const zahlungsquote = gesamtRechnungen > 0 ? (bezahlteRechnungen / gesamtRechnungen) * 100 : 0

    // Durchschnittliche Zahlungszeit
    const zahlungszeitAggr = await rechnungenCollection.aggregate([
      {
        $match: {
          kundeId: id,
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
              1000 * 60 * 60 * 24
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
    const durchschnittlicheZahlungszeit = Math.round(zahlungszeitAggr[0]?.durchschnitt || 0)

    const aktiveProjekte = await projekteCollection.countDocuments({
      kundeId: id,
      status: 'aktiv'
    })

    const abgeschlosseneProjekte = await projekteCollection.countDocuments({
      kundeId: id,
      status: 'abgeschlossen'
    })

    const gesamtprojekte = await projekteCollection.countDocuments({
      kundeId: id
    })

    // Aktivitäts-Timeline (letzte 20 Aktivitäten)
    const aktivitaeten: KundenDetailBericht['aktivitaeten'] = []

    // Anfragen
    const anfragen = await anfragenCollection
      .find({
        kundeId: id,
        erstelltAm: { $gte: vonDate, $lte: bisDate }
      })
      .sort({ erstelltAm: -1 })
      .limit(5)
      .toArray()

    for (const anfrage of anfragen) {
      aktivitaeten.push({
        _id: anfrage._id!.toString(),
        typ: 'anfrage',
        titel: `Anfrage: ${anfrage.anfragenummer}`,
        beschreibung: `${anfrage.bauvorhaben.objektname}, ${anfrage.bauvorhaben.ort}`,
        referenzId: anfrage._id!.toString(),
        status: anfrage.status,
        zeitpunkt: anfrage.erstelltAm,
        benutzer: anfrage.erstelltVon || 'System'
      })
    }

    // Angebote
    const angebote = await angeboteCollection
      .find({
        kundeId: id,
        datum: { $gte: vonDate, $lte: bisDate }
      })
      .sort({ datum: -1 })
      .limit(5)
      .toArray()

    for (const angebot of angebote) {
      aktivitaeten.push({
        _id: angebot._id!.toString(),
        typ: 'angebot',
        titel: `Angebot: ${angebot.angebotsnummer}`,
        beschreibung: angebot.betreff || 'Kein Betreff',
        referenzId: angebot._id!.toString(),
        status: angebot.status,
        betrag: angebot.brutto,
        zeitpunkt: angebot.datum,
        benutzer: angebot.erstelltVon || 'System'
      })
    }

    // Rechnungen
    const rechnungen = await rechnungenCollection
      .find({
        kundeId: id,
        rechnungsdatum: { $gte: vonDate, $lte: bisDate }
      })
      .sort({ rechnungsdatum: -1 })
      .limit(5)
      .toArray()

    for (const rechnung of rechnungen) {
      aktivitaeten.push({
        _id: rechnung._id!.toString(),
        typ: 'rechnung',
        titel: `Rechnung: ${rechnung.rechnungsnummer}`,
        beschreibung: `${rechnung.typ}`,
        referenzId: rechnung._id!.toString(),
        status: rechnung.status,
        betrag: rechnung.brutto,
        zeitpunkt: rechnung.rechnungsdatum,
        benutzer: rechnung.erstelltVon || 'System'
      })
    }

    // Mahnungen
    const mahnungen = await mahnungenCollection
      .find({
        kundeId: id,
        datum: { $gte: vonDate, $lte: bisDate }
      })
      .sort({ datum: -1 })
      .limit(5)
      .toArray()

    for (const mahnung of mahnungen) {
      aktivitaeten.push({
        _id: mahnung._id!.toString(),
        typ: 'mahnung',
        titel: `Mahnung: ${mahnung.mahnungsnummer}`,
        beschreibung: `Mahnstufe ${mahnung.mahnstufe}`,
        referenzId: mahnung._id!.toString(),
        status: mahnung.status,
        betrag: mahnung.gesamtforderung,
        zeitpunkt: mahnung.datum,
        benutzer: mahnung.erstelltVon || 'System'
      })
    }

    // Sortiere Aktivitäten nach Zeitpunkt (neueste zuerst) und begrenze auf 20
    aktivitaeten.sort((a, b) => b.zeitpunkt.getTime() - a.zeitpunkt.getTime())
    aktivitaeten.splice(20)

    const detailBericht: KundenDetailBericht = {
      kunde,
      zeitraum: {
        typ: zeitraumTyp as any,
        von: vonDate,
        bis: bisDate
      },
      kpis: {
        anzahlAnfragen,
        angebotsvolumen,
        rechnungsvolumen,
        offenerBetrag,
        mahnungenOffen,
        zahlungsquote,
        durchschnittlicheZahlungszeit,
        aktiveProjekte,
        abgeschlosseneProjekte,
        gesamtprojekte
      },
      aktivitaeten
    }

    return NextResponse.json({ erfolg: true, bericht: detailBericht })
  } catch (error) {
    console.error('Fehler beim Erstellen des Detail-Berichts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Erstellen des Detail-Berichts' },
      { status: 500 }
    )
  }
}

function berechneDateumBereich(
  typ: string,
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

