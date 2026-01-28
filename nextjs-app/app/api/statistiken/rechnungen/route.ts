/**
 * GET /api/statistiken/rechnungen
 * 
 * API für Rechnungs-Statistiken
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfYear, endOfYear } from 'date-fns'
import { Rechnung, Mahnung } from '@/lib/db/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vonParam = searchParams.get('von')
    const bisParam = searchParams.get('bis')
    
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
    
    // Parallele Abfragen
    const [
      rechnungStats,
      rechnungenProMonat,
      statusVerteilung,
      zahlungsdauerStats,
      mahnungenStats
    ] = await Promise.all([
      // 1. Rechnungen aggregiert
      db.collection<Rechnung>('rechnungen').aggregate([
        {
          $match: {
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
                $subtract: ['$brutto', { $ifNull: ['$bezahltBetrag', 0] }]
              }
            }
          }
        }
      ]).toArray(),
      
      // 2. Rechnungen pro Monat
      db.collection<Rechnung>('rechnungen').aggregate([
        {
          $match: {
            rechnungsdatum: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$rechnungsdatum' } },
            anzahl: { $sum: 1 },
            summe: { $sum: '$brutto' }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray(),
      
      // 3. Status-Verteilung
      db.collection<Rechnung>('rechnungen').aggregate([
        {
          $match: {
            rechnungsdatum: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: '$status',
            anzahl: { $sum: 1 }
          }
        }
      ]).toArray(),
      
      // 4. Zahlungsdauer (nur bezahlte Rechnungen)
      db.collection<Rechnung>('rechnungen')
        .find({
          status: 'bezahlt',
          bezahltAm: { $exists: true },
          rechnungsdatum: { $gte: von, $lte: bis }
        })
        .toArray(),
      
      // 5. Mahnungen
      db.collection<Mahnung>('mahnungen').aggregate([
        {
          $match: {
            datum: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: null,
            anzahl: { $sum: 1 },
            summe: { $sum: '$gesamtforderung' }
          }
        }
      ]).toArray()
    ])
    
    // Rechnungen aggregieren
    const rechnungen = {
      gesamt: rechnungStats.reduce((sum, r) => sum + r.anzahl, 0),
      gestellt: rechnungStats.reduce((sum, r) => sum + r.anzahl, 0),
      bezahlt: rechnungStats.find(r => r._id === 'bezahlt')?.anzahl || 0,
      offen: rechnungStats.filter(r => ['gesendet', 'ueberfaellig', 'teilbezahlt'].includes(r._id)).reduce((sum, r) => sum + r.anzahl, 0),
      ueberfaellig: rechnungStats.find(r => r._id === 'ueberfaellig')?.anzahl || 0,
      gesamtSumme: rechnungStats.reduce((sum, r) => sum + r.summe, 0),
      bezahltSumme: rechnungStats.find(r => r._id === 'bezahlt')?.summe || 0,
      offenerBetrag: rechnungStats.reduce((sum, r) => sum + r.offenerBetrag, 0),
      ueberfaelligBetrag: rechnungStats.find(r => r._id === 'ueberfaellig')?.offenerBetrag || 0
    }
    
    // Durchschnittlicher Rechnungsbetrag
    const durchschnittlicherBetrag = rechnungen.gesamt > 0
      ? rechnungen.gesamtSumme / rechnungen.gesamt
      : 0
    
    // Durchschnittliche Zahlungsdauer
    const zahlungsdauern = zahlungsdauerStats.map(r => {
      const rechnungsDatum = new Date(r.rechnungsdatum)
      const bezahltDatum = new Date(r.bezahltAm!)
      return Math.ceil((bezahltDatum.getTime() - rechnungsDatum.getTime()) / (1000 * 60 * 60 * 24))
    })
    
    const durchschnittlicheZahlungsdauer = zahlungsdauern.length > 0
      ? zahlungsdauern.reduce((sum, d) => sum + d, 0) / zahlungsdauern.length
      : 0
    
    // Zahlungsdauer Trend (pro Monat)
    const zahlungsdauerProMonat = zahlungsdauerStats.reduce((acc, r) => {
      const monat = new Date(r.bezahltAm!).toISOString().substring(0, 7)
      if (!acc[monat]) {
        acc[monat] = { summe: 0, anzahl: 0 }
      }
      const dauer = Math.ceil((new Date(r.bezahltAm!).getTime() - new Date(r.rechnungsdatum).getTime()) / (1000 * 60 * 60 * 24))
      acc[monat].summe += dauer
      acc[monat].anzahl += 1
      return acc
    }, {} as Record<string, { summe: number; anzahl: number }>)
    
    const zahlungsdauerTrend = Object.entries(zahlungsdauerProMonat)
      .map(([monat, werte]) => ({
        monat,
        durchschnitt: werte.anzahl > 0 ? werte.summe / werte.anzahl : 0
      }))
      .sort((a, b) => a.monat.localeCompare(b.monat))
    
    // Top-Rechnungen (nach Betrag)
    const topRechnungen = await db.collection<Rechnung>('rechnungen')
      .find({
        rechnungsdatum: { $gte: von, $lte: bis }
      })
      .sort({ brutto: -1 })
      .limit(10)
      .toArray()
    
    // Überfällige Rechnungen
    const ueberfaelligeRechnungen = await db.collection<Rechnung>('rechnungen')
      .find({
        status: 'ueberfaellig',
        faelligAm: { $lt: heute }
      })
      .sort({ faelligAm: 1 })
      .limit(20)
      .toArray()
    
    const mahnungen = mahnungenStats[0] || { anzahl: 0, summe: 0 }
    
    // KPIs
    const overview = [
      {
        id: 'gesamt-rechnungen',
        titel: 'Gesamt Rechnungen',
        wert: rechnungen.gesamt,
        format: 'number'
      },
      {
        id: 'bezahlt',
        titel: 'Bezahlt',
        wert: rechnungen.bezahlt,
        format: 'number',
        untertitel: `${rechnungen.bezahltSumme.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`
      },
      {
        id: 'offen',
        titel: 'Offen',
        wert: rechnungen.offen,
        format: 'number',
        untertitel: `${rechnungen.offenerBetrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`
      },
      {
        id: 'ueberfaellig',
        titel: 'Überfällig',
        wert: rechnungen.ueberfaellig,
        format: 'number',
        untertitel: `${rechnungen.ueberfaelligBetrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`
      },
      {
        id: 'durchschnitt-betrag',
        titel: 'Ø Rechnungsbetrag',
        wert: durchschnittlicherBetrag,
        format: 'currency'
      },
      {
        id: 'durchschnitt-zahlungsdauer',
        titel: 'Ø Zahlungsdauer',
        wert: durchschnittlicheZahlungsdauer.toFixed(1),
        format: 'text',
        untertitel: 'Tage'
      }
    ]
    
    return NextResponse.json({
      erfolg: true,
      data: {
        overview,
        charts: [
          {
            id: 'rechnungen-pro-monat',
            typ: 'bar',
            titel: 'Rechnungen pro Monat',
            daten: rechnungenProMonat.map((r: any) => ({
              monat: r._id,
              anzahl: r.anzahl,
              summe: r.summe
            }))
          },
          {
            id: 'status-verteilung',
            typ: 'pie',
            titel: 'Status-Verteilung',
            daten: statusVerteilung.map((s: any) => ({
              name: s._id,
              wert: s.anzahl
            }))
          },
          {
            id: 'zahlungsdauer-trend',
            typ: 'line',
            titel: 'Zahlungsdauer Trend',
            daten: zahlungsdauerTrend
          }
        ],
        tables: [
          {
            id: 'ueberfaellige-rechnungen',
            titel: 'Überfällige Rechnungen',
            daten: ueberfaelligeRechnungen.map(r => ({
              rechnungsnummer: r.rechnungsnummer,
              kundeName: r.kundeName,
              faelligAm: new Date(r.faelligAm).toISOString(),
              brutto: r.brutto,
              offenerBetrag: r.brutto - (r.bezahltBetrag || 0),
              mahnstufe: r.mahnstufe
            }))
          },
          {
            id: 'top-rechnungen',
            titel: 'Top Rechnungen nach Betrag',
            daten: topRechnungen.map(r => ({
              rechnungsnummer: r.rechnungsnummer,
              kundeName: r.kundeName,
              rechnungsdatum: new Date(r.rechnungsdatum).toISOString(),
              brutto: r.brutto,
              status: r.status
            }))
          }
        ],
        mahnungen: {
          anzahl: mahnungen.anzahl,
          summe: mahnungen.summe
        }
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
    console.error('[GET /api/statistiken/rechnungen] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Rechnungs-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
