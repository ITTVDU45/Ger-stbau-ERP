import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { KundenKennzahlen, ZeitraumFilter } from '@/lib/db/types'
import { startOfDay, endOfDay, subDays, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subYears, subQuarters } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const zeitraumTyp = searchParams.get('zeitraumTyp') || 'aktuelles_jahr'
    const von = searchParams.get('von')
    const bis = searchParams.get('bis')

    console.log('[KundenBerichte] Lade Kundenliste für Zeitraum:', zeitraumTyp)

    // Berechne Zeitraum basierend auf Typ
    const { vonDate, bisDate } = berechneDateumBereich(zeitraumTyp as ZeitraumFilter['typ'], von, bis)

    const db = await getDatabase()
    const kundenCollection = db.collection('kunden')
    const projekteCollection = db.collection('projekte')
    const angeboteCollection = db.collection('angebote')
    const anfragenCollection = db.collection('anfragen')
    const rechnungenCollection = db.collection('rechnungen')
    const mahnungenCollection = db.collection('mahnungen')

    // Hole alle Kunden (aktive und inaktive)
    const kunden = await kundenCollection.find({}).toArray()
    
    console.log(`[KundenBerichte] ${kunden.length} Kunden gefunden`)

    // Wenn keine Kunden, gebe leeres Array zurück
    if (kunden.length === 0) {
      return NextResponse.json({ erfolg: true, kunden: [] })
    }

    // Aggregiere Kennzahlen für jeden Kunden
    const kundenKennzahlen: KundenKennzahlen[] = []

    for (const kunde of kunden) {
      const kundeId = kunde._id!.toString()

      // Anzahl Projekte (gesamt, nicht im Zeitraum)
      const anzahlProjekte = await projekteCollection.countDocuments({ kundeId })

      // Anzahl Angebote im Zeitraum
      const anzahlAngebote = await angeboteCollection.countDocuments({
        kundeId,
        datum: { $gte: vonDate, $lte: bisDate }
      })

      // Anzahl Anfragen im Zeitraum
      const anzahlAnfragen = await anfragenCollection.countDocuments({
        kundeId,
        erstelltAm: { $gte: vonDate, $lte: bisDate }
      })

      // Rechnungen offen
      const rechnungenOffen = await rechnungenCollection.countDocuments({
        kundeId,
        status: { $in: ['offen', 'ueberfaellig', 'teilweise_bezahlt'] }
      })

      // Rechnungen bezahlt
      const rechnungenBezahlt = await rechnungenCollection.countDocuments({
        kundeId,
        status: 'bezahlt'
      })

      // Offener Betrag
      const offenerBetragAggregation = await rechnungenCollection.aggregate([
        {
          $match: {
            kundeId,
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
      const offenerBetrag = offenerBetragAggregation[0]?.summe || 0

      // Mahnungen offen
      const mahnungenOffen = await mahnungenCollection.countDocuments({
        kundeId,
        status: { $in: ['erstellt', 'zur_genehmigung', 'genehmigt', 'versendet'] }
      })

      // Umsatz im Zeitraum
      const umsatzAggregation = await rechnungenCollection.aggregate([
        {
          $match: {
            kundeId,
            rechnungsdatum: { $gte: vonDate, $lte: bisDate },
            status: 'bezahlt'
          }
        },
        {
          $group: {
            _id: null,
            summe: { $sum: '$brutto' }
          }
        }
      ]).toArray()
      const umsatzImZeitraum = umsatzAggregation[0]?.summe || 0

      // Letzte Aktivität (neueste von Projekt, Angebot, Rechnung, Anfrage)
      const letzteProjektAktivitaet = await projekteCollection.findOne(
        { kundeId },
        { sort: { zuletztGeaendert: -1 }, projection: { zuletztGeaendert: 1 } }
      )
      const letztesAngebot = await angeboteCollection.findOne(
        { kundeId },
        { sort: { datum: -1 }, projection: { datum: 1 } }
      )
      const letzteRechnung = await rechnungenCollection.findOne(
        { kundeId },
        { sort: { rechnungsdatum: -1 }, projection: { rechnungsdatum: 1 } }
      )
      const letzteAnfrage = await anfragenCollection.findOne(
        { kundeId },
        { sort: { erstelltAm: -1 }, projection: { erstelltAm: 1 } }
      )

      const aktivitaeten = [
        letzteProjektAktivitaet?.zuletztGeaendert,
        letztesAngebot?.datum,
        letzteRechnung?.rechnungsdatum,
        letzteAnfrage?.erstelltAm
      ].filter(Boolean)

      const letzteAktivitaet = aktivitaeten.length > 0
        ? new Date(Math.max(...aktivitaeten.map(d => new Date(d).getTime())))
        : undefined

      // Status bestimmen
      let status: 'aktiv' | 'inaktiv' | 'gesperrt' | 'mahnsperre' = 'aktiv'
      if (!kunde.aktiv) {
        status = 'inaktiv'
      } else if (kunde.mahnwesen?.mahnung_gesperrt_grund) {
        status = 'mahnsperre'
      }

      kundenKennzahlen.push({
        kundeId,
        kundennummer: kunde.kundennummer || '',
        kundeName: kunde.firma || `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim(),
        firma: kunde.firma,
        ansprechpartner: kunde.ansprechpartner
          ? `${kunde.ansprechpartner.vorname || ''} ${kunde.ansprechpartner.nachname || ''}`.trim()
          : undefined,
        anzahlProjekte,
        anzahlAngebote,
        anzahlAnfragen,
        rechnungenOffen,
        rechnungenBezahlt,
        offenerBetrag,
        mahnungenOffen,
        umsatzImZeitraum,
        letzteAktivitaet,
        status,
        kategorisierung: kunde.kategorisierung
      })
    }

    // Sortiere nach Umsatz im Zeitraum (höchster zuerst)
    kundenKennzahlen.sort((a, b) => b.umsatzImZeitraum - a.umsatzImZeitraum)

    return NextResponse.json({ erfolg: true, kunden: kundenKennzahlen })
  } catch (error) {
    console.error('Fehler beim Laden der Kundenliste:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Kundenliste', details: errorMessage },
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

