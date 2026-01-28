/**
 * GET /api/statistiken/kunden
 * 
 * API für Kunden-Statistiken (Übersicht alle Kunden)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { Kunde, Projekt, Rechnung, Angebot, Anfrage } from '@/lib/db/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vonParam = searchParams.get('von')
    const bisParam = searchParams.get('bis')
    const kundeId = searchParams.get('kundeId')
    
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
    
    // Filter für Kunden
    const kundenFilter: any = { aktiv: true }
    if (kundeId) {
      kundenFilter._id = kundeId
    }
    
    // Alle aktiven Kunden laden
    const kunden = await db.collection<Kunde>('kunden')
      .find(kundenFilter)
      .toArray()
    
    // Für jeden Kunden Statistiken berechnen
    const kundenStats = await Promise.all(
      kunden.map(async (kunde) => {
        const kundeIdStr = kunde._id?.toString() || ''
        
        // Parallele Abfragen
        const [
          projektStats,
          rechnungStats,
          angebotStats,
          anfrageStats
        ] = await Promise.all([
          // 1. Projekte
          db.collection<Projekt>('projekte').aggregate([
            {
              $match: { kundeId: kundeIdStr }
            },
            {
              $group: {
                _id: '$status',
                anzahl: { $sum: 1 },
                gesamtWert: { $sum: { $ifNull: ['$angebotssumme', 0] } }
              }
            }
          ]).toArray(),
          
          // 2. Rechnungen
          db.collection<Rechnung>('rechnungen').aggregate([
            {
              $match: {
                kundeId: kundeIdStr,
                rechnungsdatum: { $gte: von, $lte: bis }
              }
            },
            {
              $group: {
                _id: '$status',
                anzahl: { $sum: 1 },
                summe: { $sum: '$brutto' },
                offenerBetrag: {
                  $sum: {
                    $subtract: [
                      '$brutto',
                      { $ifNull: ['$bezahltBetrag', 0] }
                    ]
                  }
                }
              }
            }
          ]).toArray(),
          
          // 3. Angebote
          db.collection<Angebot>('angebote').aggregate([
            {
              $match: { kundeId: kundeIdStr }
            },
            {
              $group: {
                _id: '$status',
                anzahl: { $sum: 1 },
                gesamtWert: { $sum: '$brutto' }
              }
            }
          ]).toArray(),
          
          // 4. Anfragen
          db.collection<Anfrage>('anfragen').countDocuments({
            kundeId: kundeIdStr
          })
        ])
        
        // Projekte aggregieren
        const projekte = {
          gesamt: projektStats.reduce((sum, p) => sum + p.anzahl, 0),
          aktiv: projektStats.find(p => p._id === 'aktiv')?.anzahl || 0,
          abgeschlossen: projektStats.find(p => p._id === 'abgeschlossen')?.anzahl || 0,
          inPlanung: projektStats.find(p => p._id === 'in_planung')?.anzahl || 0
        }
        
        // Rechnungen aggregieren
        const rechnungen = {
          gesamt: rechnungStats.reduce((sum, r) => sum + r.anzahl, 0),
          bezahlt: rechnungStats.find(r => r._id === 'bezahlt')?.anzahl || 0,
          offen: rechnungStats.filter(r => ['gesendet', 'ueberfaellig', 'teilbezahlt'].includes(r._id)).reduce((sum, r) => sum + r.anzahl, 0),
          offenerBetrag: rechnungStats.reduce((sum, r) => sum + r.offenerBetrag, 0),
          gesamtSumme: rechnungStats.reduce((sum, r) => sum + r.summe, 0)
        }
        
        // Angebote aggregieren
        const angebote = {
          gesamt: angebotStats.reduce((sum, a) => sum + a.anzahl, 0),
          angenommen: angebotStats.find(a => a._id === 'angenommen')?.anzahl || 0,
          abgelehnt: angebotStats.find(a => a._id === 'abgelehnt')?.anzahl || 0,
          ausstehend: angebotStats.filter(a => ['entwurf', 'gesendet'].includes(a._id)).reduce((sum, a) => sum + a.anzahl, 0),
          gesamtWert: angebotStats.reduce((sum, a) => sum + a.gesamtWert, 0),
          angenommenWert: angebotStats.find(a => a._id === 'angenommen')?.gesamtWert || 0
        }
        
        // Angebotsquote berechnen
        const angebotsquote = angebote.gesamt > 0
          ? (angebote.angenommen / angebote.gesamt) * 100
          : 0
        
        // Durchschnittlicher Projektwert
        const projektWerte = projektStats
          .filter(p => p.gesamtWert > 0)
          .map(p => p.gesamtWert)
        const durchschnittlicherProjektwert = projektWerte.length > 0
          ? projektWerte.reduce((sum, w) => sum + w, 0) / projektWerte.length
          : 0
        
        // Projektlaufzeit (Durchschnitt)
        const projekteMitDaten = await db.collection<Projekt>('projekte')
          .find({
            kundeId: kundeIdStr,
            startdatum: { $exists: true },
            enddatum: { $exists: true }
          })
          .toArray()
        
        const durchschnittlicheLaufzeit = projekteMitDaten.length > 0
          ? projekteMitDaten.reduce((sum, p) => {
              const start = new Date(p.startdatum!)
              const end = new Date(p.enddatum!)
              const tage = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
              return sum + tage
            }, 0) / projekteMitDaten.length
          : 0
        
        // Zahlungsverhalten (Durchschnittliche Zahlungsdauer)
        const bezahlteRechnungen = await db.collection<Rechnung>('rechnungen')
          .find({
            kundeId: kundeIdStr,
            status: 'bezahlt',
            bezahltAm: { $exists: true },
            rechnungsdatum: { $exists: true }
          })
          .toArray()
        
        const zahlungsdauern = bezahlteRechnungen.map(r => {
          const rechnungsDatum = new Date(r.rechnungsdatum)
          const bezahltDatum = new Date(r.bezahltAm!)
          return Math.ceil((bezahltDatum.getTime() - rechnungsDatum.getTime()) / (1000 * 60 * 60 * 24))
        })
        
        const durchschnittlicheZahlungsdauer = zahlungsdauern.length > 0
          ? zahlungsdauern.reduce((sum, d) => sum + d, 0) / zahlungsdauern.length
          : 0
        
        // Gesamtumsatz (aus bezahlten Rechnungen)
        const umsatzGesamt = await db.collection<Rechnung>('rechnungen')
          .aggregate([
            {
              $match: {
                kundeId: kundeIdStr,
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
                kundeId: kundeIdStr,
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
        
        return {
          kundeId: kundeIdStr,
          kundeName: kunde.firma || `${kunde.vorname} ${kunde.nachname}`,
          kundennummer: kunde.kundennummer,
          projekte: {
            gesamt: projekte.gesamt,
            aktiv: projekte.aktiv,
            abgeschlossen: projekte.abgeschlossen,
            inPlanung: projekte.inPlanung
          },
          umsatz: {
            gesamt: umsatz,
            proMonat: umsatzProMonat.map((u: any) => ({
              monat: u._id,
              summe: u.summe
            }))
          },
          rechnungen: {
            gesamt: rechnungen.gesamt,
            bezahlt: rechnungen.bezahlt,
            offen: rechnungen.offen,
            offenerBetrag: rechnungen.offenerBetrag,
            gesamtSumme: rechnungen.gesamtSumme
          },
          angebote: {
            gesamt: angebote.gesamt,
            angenommen: angebote.angenommen,
            abgelehnt: angebote.abgelehnt,
            ausstehend: angebote.ausstehend,
            angebotsquote,
            gesamtWert: angebote.gesamtWert,
            angenommenWert: angebote.angenommenWert
          },
          anfragen: {
            anzahl: anfrageStats
          },
          durchschnittlicherProjektwert,
          durchschnittlicheLaufzeit: durchschnittlicheLaufzeit,
          durchschnittlicheZahlungsdauer: durchschnittlicheZahlungsdauer,
          kundenwert: umsatz // Lifetime Value = Gesamtumsatz
        }
      })
    )
    
    // Aggregierte Charts-Daten
    const umsatzProMonatChart = kundenStats.reduce((acc, stat) => {
      stat.umsatz.proMonat.forEach((item: any) => {
        if (!acc[item.monat]) {
          acc[item.monat] = 0
        }
        acc[item.monat] += item.summe
      })
      return acc
    }, {} as Record<string, number>)
    
    const topKundenChart = [...kundenStats]
      .sort((a, b) => b.umsatz.gesamt - a.umsatz.gesamt)
      .slice(0, 10)
      .map(stat => ({
        name: stat.kundeName,
        umsatz: stat.umsatz.gesamt
      }))
    
    const projektstatusChart = kundenStats.reduce((acc, stat) => {
      acc.aktiv = (acc.aktiv || 0) + stat.projekte.aktiv
      acc.abgeschlossen = (acc.abgeschlossen || 0) + stat.projekte.abgeschlossen
      acc.inPlanung = (acc.inPlanung || 0) + stat.projekte.inPlanung
      return acc
    }, { aktiv: 0, abgeschlossen: 0, inPlanung: 0 })
    
    // Top-Kunden nach Umsatz
    const topKunden = [...kundenStats]
      .sort((a, b) => b.umsatz.gesamt - a.umsatz.gesamt)
      .slice(0, 10)
      .map(stat => ({
        kundeId: stat.kundeId,
        name: stat.kundeName,
        umsatz: stat.umsatz.gesamt,
        projekte: stat.projekte.gesamt,
        angebotsquote: stat.angebote.angebotsquote
      }))
    
    // KPIs
    const overview = [
      {
        id: 'gesamtumsatz',
        titel: 'Gesamtumsatz',
        wert: kundenStats.reduce((sum, s) => sum + s.umsatz.gesamt, 0),
        format: 'currency'
      },
      {
        id: 'aktive-projekte',
        titel: 'Aktive Projekte',
        wert: kundenStats.reduce((sum, s) => sum + s.projekte.aktiv, 0),
        format: 'number'
      },
      {
        id: 'durchschnitt-angebotsquote',
        titel: 'Ø Angebotsquote',
        wert: kundenStats.length > 0
          ? kundenStats.reduce((sum, s) => sum + s.angebote.angebotsquote, 0) / kundenStats.length
          : 0,
        format: 'percent'
      }
    ]
    
    return NextResponse.json({
      erfolg: true,
      data: {
        overview,
        kunden: kundenStats,
        charts: [
          {
            id: 'umsatz-pro-monat',
            typ: 'line',
            titel: 'Umsatz pro Monat',
            daten: Object.entries(umsatzProMonatChart).map(([monat, summe]) => ({
              monat,
              summe
            })).sort((a, b) => a.monat.localeCompare(b.monat))
          },
          {
            id: 'top-kunden',
            typ: 'bar',
            titel: 'Top Kunden nach Umsatz',
            daten: topKundenChart
          },
          {
            id: 'projektstatus',
            typ: 'pie',
            titel: 'Projektstatus-Verteilung',
            daten: [
              { name: 'Aktiv', wert: projektstatusChart.aktiv },
              { name: 'Abgeschlossen', wert: projektstatusChart.abgeschlossen },
              { name: 'In Planung', wert: projektstatusChart.inPlanung }
            ]
          }
        ],
        tables: [
          {
            id: 'top-kunden',
            titel: 'Top Kunden nach Umsatz',
            daten: topKunden
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
    console.error('[GET /api/statistiken/kunden] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Kunden-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
