/**
 * GET /api/statistiken/kunden/[id]
 * 
 * API für detaillierte Statistiken eines einzelnen Kunden
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfYear, endOfYear } from 'date-fns'
import { Kunde, Projekt, Rechnung, Angebot, Anfrage } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const vonParam = searchParams.get('von')
    const bisParam = searchParams.get('bis')
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Kunden-ID' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const heute = new Date()
    
    // Zeitraum bestimmen
    let von: Date
    let bis: Date
    
    if (vonParam && bisParam) {
      von = new Date(vonParam)
      bis = new Date(bisParam)
      bis.setHours(23, 59, 59, 999)
    } else {
      // Default: Aktuelles Jahr
      von = startOfYear(heute)
      bis = endOfYear(heute)
    }
    
    // Kunde laden
    const kunde = await db.collection<Kunde>('kunden')
      .findOne({ _id: new ObjectId(id) })
    
    if (!kunde) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kunde nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Parallele Abfragen
    const [
      projekte,
      rechnungen,
      angebote,
      anfragen
    ] = await Promise.all([
      // 1. Alle Projekte
      db.collection<Projekt>('projekte')
        .find({ kundeId: id })
        .sort({ erstelltAm: -1 })
        .toArray(),
      
      // 2. Rechnungen
      db.collection<Rechnung>('rechnungen')
        .find({
          kundeId: id,
          rechnungsdatum: { $gte: von, $lte: bis }
        })
        .sort({ rechnungsdatum: -1 })
        .toArray(),
      
      // 3. Angebote
      db.collection<Angebot>('angebote')
        .find({ kundeId: id })
        .sort({ datum: -1 })
        .toArray(),
      
      // 4. Anfragen
      db.collection<Anfrage>('anfragen')
        .find({ kundeId: id })
        .sort({ erstelltAm: -1 })
        .toArray()
    ])
    
    // Projekte aggregieren
    const projektStats = {
      gesamt: projekte.length,
      aktiv: projekte.filter(p => p.status === 'aktiv').length,
      abgeschlossen: projekte.filter(p => p.status === 'abgeschlossen').length,
      inPlanung: projekte.filter(p => p.status === 'in_planung').length
    }
    
    // Rechnungen aggregieren
    const rechnungStats = {
      gesamt: rechnungen.length,
      bezahlt: rechnungen.filter(r => r.status === 'bezahlt').length,
      offen: rechnungen.filter(r => ['gesendet', 'ueberfaellig', 'teilbezahlt'].includes(r.status)).length,
      offenerBetrag: rechnungen.reduce((sum, r) => {
        return sum + (r.brutto - (r.bezahltBetrag || 0))
      }, 0),
      gesamtSumme: rechnungen.reduce((sum, r) => sum + r.brutto, 0)
    }
    
    // Angebote aggregieren
    const angebotStats = {
      gesamt: angebote.length,
      angenommen: angebote.filter(a => a.status === 'angenommen').length,
      abgelehnt: angebote.filter(a => a.status === 'abgelehnt').length,
      ausstehend: angebote.filter(a => ['entwurf', 'gesendet'].includes(a.status)).length,
      gesamtWert: angebote.reduce((sum, a) => sum + a.brutto, 0),
      angenommenWert: angebote.filter(a => a.status === 'angenommen').reduce((sum, a) => sum + a.brutto, 0)
    }
    
    // Angebotsquote
    const angebotsquote = angebotStats.gesamt > 0
      ? (angebotStats.angenommen / angebotStats.gesamt) * 100
      : 0
    
    // Gesamtumsatz
    const umsatzGesamt = await db.collection<Rechnung>('rechnungen')
      .aggregate([
        {
          $match: {
            kundeId: id,
            status: { $in: ['bezahlt', 'teilbezahlt'] }
          }
        },
        {
          $group: {
            _id: null,
            gesamt: { $sum: '$brutto' }
          }
        }
      ])
      .toArray()
    
    const umsatz = umsatzGesamt[0]?.gesamt || 0
    
    // Umsatz pro Monat
    const umsatzProMonat = await db.collection<Rechnung>('rechnungen')
      .aggregate([
        {
          $match: {
            kundeId: id,
            status: { $in: ['bezahlt', 'teilbezahlt'] },
            bezahltAm: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$bezahltAm' } },
            summe: { $sum: '$brutto' }
          }
        },
        { $sort: { _id: 1 } }
      ])
      .toArray()
    
    // Durchschnittlicher Projektwert
    const projektWerte = projekte
      .filter(p => p.angebotssumme && p.angebotssumme > 0)
      .map(p => p.angebotssumme!)
    const durchschnittlicherProjektwert = projektWerte.length > 0
      ? projektWerte.reduce((sum, w) => sum + w, 0) / projektWerte.length
      : 0
    
    // Durchschnittliche Projektlaufzeit
    const projekteMitDaten = projekte.filter(
      p => p.startdatum && p.enddatum
    )
    const durchschnittlicheLaufzeit = projekteMitDaten.length > 0
      ? projekteMitDaten.reduce((sum, p) => {
          const start = new Date(p.startdatum!)
          const end = new Date(p.enddatum!)
          const tage = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          return sum + tage
        }, 0) / projekteMitDaten.length
      : 0
    
    // Zahlungsverhalten
    const bezahlteRechnungen = rechnungen.filter(
      r => r.status === 'bezahlt' && r.bezahltAm
    )
    const zahlungsdauern = bezahlteRechnungen.map(r => {
      const rechnungsDatum = new Date(r.rechnungsdatum)
      const bezahltDatum = new Date(r.bezahltAm!)
      return Math.ceil((bezahltDatum.getTime() - rechnungsDatum.getTime()) / (1000 * 60 * 60 * 24))
    })
    const durchschnittlicheZahlungsdauer = zahlungsdauern.length > 0
      ? zahlungsdauern.reduce((sum, d) => sum + d, 0) / zahlungsdauern.length
      : 0
    
    // Projekt-Historie
    const projektHistorie = projekte.map(p => ({
      id: p._id?.toString(),
      projektname: p.projektname,
      status: p.status,
      startdatum: p.startdatum ? new Date(p.startdatum).toISOString() : null,
      enddatum: p.enddatum ? new Date(p.enddatum).toISOString() : null,
      angebotssumme: p.angebotssumme || 0,
      bereitsAbgerechnet: p.bereitsAbgerechnet || 0
    }))
    
    // Rechnungs-Historie
    const rechnungsHistorie = rechnungen.map(r => ({
      id: r._id?.toString(),
      rechnungsnummer: r.rechnungsnummer,
      rechnungsdatum: new Date(r.rechnungsdatum).toISOString(),
      faelligAm: new Date(r.faelligAm).toISOString(),
      status: r.status,
      brutto: r.brutto,
      bezahltBetrag: r.bezahltBetrag || 0,
      offenerBetrag: r.brutto - (r.bezahltBetrag || 0)
    }))
    
    // Angebots-Historie
    const angebotsHistorie = angebote.map(a => ({
      id: a._id?.toString(),
      angebotsnummer: a.angebotsnummer,
      datum: new Date(a.datum).toISOString(),
      status: a.status,
      brutto: a.brutto,
      angenommenAm: a.angenommenAm ? new Date(a.angenommenAm).toISOString() : null
    }))
    
    return NextResponse.json({
      erfolg: true,
      data: {
        kunde: {
          id: kunde._id?.toString(),
          name: kunde.firma || `${kunde.vorname} ${kunde.nachname}`,
          kundennummer: kunde.kundennummer,
          email: kunde.email
        },
        overview: [
          {
            id: 'projekte',
            titel: 'Projekte',
            wert: projektStats.gesamt,
            format: 'number',
            untertitel: `${projektStats.aktiv} aktiv, ${projektStats.abgeschlossen} abgeschlossen`
          },
          {
            id: 'umsatz',
            titel: 'Gesamtumsatz',
            wert: umsatz,
            format: 'currency'
          },
          {
            id: 'offene-rechnungen',
            titel: 'Offene Rechnungen',
            wert: rechnungStats.offen,
            format: 'number',
            untertitel: `${rechnungStats.offenerBetrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} offen`
          },
          {
            id: 'angebote',
            titel: 'Angebote',
            wert: angebotStats.gesamt,
            format: 'number',
            untertitel: `${angebotStats.angenommen} angenommen (${angebotsquote.toFixed(1)}%)`
          },
          {
            id: 'durchschnitt-projektwert',
            titel: 'Ø Projektwert',
            wert: durchschnittlicherProjektwert,
            format: 'currency'
          },
          {
            id: 'zahlungsdauer',
            titel: 'Ø Zahlungsdauer',
            wert: durchschnittlicheZahlungsdauer.toFixed(1),
            format: 'text',
            untertitel: 'Tage'
          }
        ],
        charts: [
          {
            id: 'umsatz-pro-monat',
            typ: 'line',
            titel: 'Umsatz pro Monat',
            daten: umsatzProMonat.map((u: any) => ({
              monat: u._id,
              summe: u.summe
            }))
          },
          {
            id: 'projektstatus',
            typ: 'pie',
            titel: 'Projektstatus',
            daten: [
              { name: 'Aktiv', wert: projektStats.aktiv },
              { name: 'Abgeschlossen', wert: projektStats.abgeschlossen },
              { name: 'In Planung', wert: projektStats.inPlanung }
            ]
          }
        ],
        tables: [
          {
            id: 'projekt-historie',
            titel: 'Projekt-Historie',
            daten: projektHistorie
          },
          {
            id: 'rechnungs-historie',
            titel: 'Rechnungs-Historie',
            daten: rechnungsHistorie
          },
          {
            id: 'angebots-historie',
            titel: 'Angebots-Historie',
            daten: angebotsHistorie
          }
        ]
      },
      meta: {
        zeitraum: {
          von: von.toISOString(),
          bis: bis.toISOString()
        },
        aktualisiert: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
    
  } catch (error) {
    console.error('[GET /api/statistiken/kunden/[id]] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Kunden-Detail-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
