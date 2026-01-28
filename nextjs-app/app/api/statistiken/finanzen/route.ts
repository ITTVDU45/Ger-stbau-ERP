/**
 * GET /api/statistiken/finanzen
 * 
 * API für Finanz-Statistiken
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns'
import { Transaktion, Rechnung, KontostandSnapshot } from '@/lib/db/types'

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
      einnahmenStats,
      ausgabenStats,
      einnahmenProMonat,
      ausgabenProMonat,
      ausgabenKategorien,
      rechnungenOffen,
      kontostand
    ] = await Promise.all([
      // 1. Einnahmen gesamt
      db.collection<Transaktion>('transaktionen').aggregate([
        {
          $match: {
            typ: 'einnahme',
            datum: { $gte: von, $lte: bis },
            status: { $ne: 'storniert' }
          }
        },
        {
          $group: {
            _id: null,
            gesamt: { $sum: '$betrag' },
            anzahl: { $sum: 1 }
          }
        }
      ]).toArray(),
      
      // 2. Ausgaben gesamt
      db.collection<Transaktion>('transaktionen').aggregate([
        {
          $match: {
            typ: 'ausgabe',
            datum: { $gte: von, $lte: bis },
            status: { $ne: 'storniert' }
          }
        },
        {
          $group: {
            _id: null,
            gesamt: { $sum: '$betrag' },
            anzahl: { $sum: 1 }
          }
        }
      ]).toArray(),
      
      // 3. Einnahmen pro Monat
      db.collection<Transaktion>('transaktionen').aggregate([
        {
          $match: {
            typ: 'einnahme',
            datum: { $gte: von, $lte: bis },
            status: { $ne: 'storniert' }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$datum' } },
            summe: { $sum: '$betrag' }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray(),
      
      // 4. Ausgaben pro Monat
      db.collection<Transaktion>('transaktionen').aggregate([
        {
          $match: {
            typ: 'ausgabe',
            datum: { $gte: von, $lte: bis },
            status: { $ne: 'storniert' }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$datum' } },
            summe: { $sum: '$betrag' }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray(),
      
      // 5. Ausgaben nach Kategorie
      db.collection<Transaktion>('transaktionen').aggregate([
        {
          $match: {
            typ: 'ausgabe',
            datum: { $gte: von, $lte: bis },
            status: { $ne: 'storniert' }
          }
        },
        {
          $group: {
            _id: '$kategorieName',
            summe: { $sum: '$betrag' },
            anzahl: { $sum: 1 }
          }
        },
        { $sort: { summe: -1 } }
      ]).toArray(),
      
      // 6. Offene Forderungen (aus Rechnungen)
      db.collection<Rechnung>('rechnungen').aggregate([
        {
          $match: {
            status: { $in: ['gesendet', 'ueberfaellig', 'teilbezahlt'] }
          }
        },
        {
          $group: {
            _id: null,
            anzahl: { $sum: 1 },
            summe: {
              $sum: {
                $subtract: ['$brutto', { $ifNull: ['$bezahltBetrag', 0] }]
              }
            }
          }
        }
      ]).toArray(),
      
      // 7. Aktueller Kontostand
      db.collection<KontostandSnapshot>('kontostand_snapshots')
        .findOne({}, { sort: { datum: -1 } })
    ])
    
    const einnahmen = einnahmenStats[0]?.gesamt || 0
    const ausgaben = ausgabenStats[0]?.gesamt || 0
    const gewinn = einnahmen - ausgaben
    const gewinnmarge = einnahmen > 0 ? (gewinn / einnahmen) * 100 : 0
    const cashflow = einnahmen - ausgaben
    
    const offeneForderungen = rechnungenOffen[0] || { anzahl: 0, summe: 0 }
    const liquiditaet = kontostand?.betrag || 0
    
    // Einnahmen vs. Ausgaben Chart (kombiniert)
    const einnahmenAusgabenChart = new Map<string, { einnahmen: number; ausgaben: number }>()
    
    einnahmenProMonat.forEach((item: any) => {
      const monat = item._id
      if (!einnahmenAusgabenChart.has(monat)) {
        einnahmenAusgabenChart.set(monat, { einnahmen: 0, ausgaben: 0 })
      }
      einnahmenAusgabenChart.get(monat)!.einnahmen = item.summe
    })
    
    ausgabenProMonat.forEach((item: any) => {
      const monat = item._id
      if (!einnahmenAusgabenChart.has(monat)) {
        einnahmenAusgabenChart.set(monat, { einnahmen: 0, ausgaben: 0 })
      }
      einnahmenAusgabenChart.get(monat)!.ausgaben = item.summe
    })
    
    // Ausgabenkategorien gruppieren
    const ausgabenKategorienGruppiert = ausgabenKategorien.reduce((acc, item) => {
      const kategorie = item._id || 'Sonstiges'
      const kategorieLower = kategorie.toLowerCase()
      
      if (kategorieLower.includes('personal') || kategorieLower.includes('lohn')) {
        acc.personal = (acc.personal || 0) + item.summe
      } else if (kategorieLower.includes('material') || kategorieLower.includes('waren')) {
        acc.material = (acc.material || 0) + item.summe
      } else if (kategorieLower.includes('betrieb') || kategorieLower.includes('miete') || kategorieLower.includes('strom')) {
        acc.betriebskosten = (acc.betriebskosten || 0) + item.summe
      } else {
        acc.sonstiges = (acc.sonstiges || 0) + item.summe
      }
      
      return acc
    }, { personal: 0, material: 0, betriebskosten: 0, sonstiges: 0 } as Record<string, number>)
    
    // Top-Ausgabenkategorien
    const topAusgabenkategorien = ausgabenKategorien
      .slice(0, 10)
      .map(item => ({
        kategorie: item._id || 'Sonstiges',
        betrag: item.summe,
        anzahl: item.anzahl
      }))
    
    // Cashflow Trend
    const cashflowTrend = Array.from(einnahmenAusgabenChart.entries())
      .map(([monat, werte]) => ({
        monat,
        cashflow: werte.einnahmen - werte.ausgaben
      }))
      .sort((a, b) => a.monat.localeCompare(b.monat))
    
    // KPIs
    const overview = [
      {
        id: 'einnahmen',
        titel: 'Einnahmen',
        wert: einnahmen,
        format: 'currency'
      },
      {
        id: 'ausgaben',
        titel: 'Ausgaben',
        wert: ausgaben,
        format: 'currency'
      },
      {
        id: 'gewinn',
        titel: 'Gewinn',
        wert: gewinn,
        format: 'currency',
        untertitel: `${gewinnmarge.toFixed(1)}% Marge`
      },
      {
        id: 'cashflow',
        titel: 'Cashflow',
        wert: cashflow,
        format: 'currency'
      },
      {
        id: 'offene-forderungen',
        titel: 'Offene Forderungen',
        wert: offeneForderungen.anzahl,
        format: 'number',
        untertitel: `${offeneForderungen.summe.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`
      },
      {
        id: 'liquiditaet',
        titel: 'Liquidität',
        wert: liquiditaet,
        format: 'currency'
      }
    ]
    
    return NextResponse.json({
      erfolg: true,
      data: {
        overview,
        charts: [
          {
            id: 'einnahmen-vs-ausgaben',
            typ: 'area',
            titel: 'Einnahmen vs. Ausgaben',
            daten: Array.from(einnahmenAusgabenChart.entries())
              .map(([monat, werte]) => ({
                monat,
                einnahmen: werte.einnahmen,
                ausgaben: werte.ausgaben
              }))
              .sort((a, b) => a.monat.localeCompare(b.monat))
          },
          {
            id: 'ausgaben-kategorien',
            typ: 'pie',
            titel: 'Ausgaben nach Kategorie',
            daten: [
              { name: 'Personal', wert: ausgabenKategorienGruppiert.personal },
              { name: 'Material', wert: ausgabenKategorienGruppiert.material },
              { name: 'Betriebskosten', wert: ausgabenKategorienGruppiert.betriebskosten },
              { name: 'Sonstiges', wert: ausgabenKategorienGruppiert.sonstiges }
            ]
          },
          {
            id: 'cashflow-trend',
            typ: 'line',
            titel: 'Cashflow Trend',
            daten: cashflowTrend
          }
        ],
        tables: [
          {
            id: 'top-ausgabenkategorien',
            titel: 'Top Ausgabenkategorien',
            daten: topAusgabenkategorien
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
    console.error('[GET /api/statistiken/finanzen] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Finanz-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
