/**
 * GET /api/statistiken/angebote
 * 
 * API für Angebots-Statistiken
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfYear, endOfYear } from 'date-fns'
import { Angebot } from '@/lib/db/types'

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
      angebotStats,
      angeboteProMonat,
      statusVerteilung,
      erfolgsrateKunde,
      erfolgsrateTyp
    ] = await Promise.all([
      // 1. Angebote aggregiert
      db.collection<Angebot>('angebote').aggregate([
        {
          $match: {
            datum: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: '$status',
            anzahl: { $sum: 1 },
            gesamtWert: { $sum: '$brutto' }
          }
        }
      ]).toArray(),
      
      // 2. Angebote pro Monat
      db.collection<Angebot>('angebote').aggregate([
        {
          $match: {
            datum: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$datum' } },
            anzahl: { $sum: 1 },
            gesamtWert: { $sum: '$brutto' },
            angenommen: {
              $sum: { $cond: [{ $eq: ['$status', 'angenommen'] }, 1, 0] }
            },
            angenommenWert: {
              $sum: {
                $cond: [{ $eq: ['$status', 'angenommen'] }, '$brutto', 0]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray(),
      
      // 3. Status-Verteilung
      db.collection<Angebot>('angebote').aggregate([
        {
          $match: {
            datum: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: '$status',
            anzahl: { $sum: 1 }
          }
        }
      ]).toArray(),
      
      // 4. Erfolgsrate nach Kunde
      db.collection<Angebot>('angebote').aggregate([
        {
          $match: {
            datum: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: '$kundeId',
            kundeName: { $first: '$kundeName' },
            gesamt: { $sum: 1 },
            angenommen: {
              $sum: { $cond: [{ $eq: ['$status', 'angenommen'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            kundeName: 1,
            gesamt: 1,
            angenommen: 1,
            erfolgsrate: {
              $cond: [
                { $gt: ['$gesamt', 0] },
                { $multiply: [{ $divide: ['$angenommen', '$gesamt'] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { erfolgsrate: -1 } },
        { $limit: 10 }
      ]).toArray(),
      
      // 5. Erfolgsrate nach Projekttyp
      db.collection<Angebot>('angebote').aggregate([
        {
          $match: {
            datum: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: '$angebotTyp',
            gesamt: { $sum: 1 },
            angenommen: {
              $sum: { $cond: [{ $eq: ['$status', 'angenommen'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            typ: '$_id',
            gesamt: 1,
            angenommen: 1,
            erfolgsrate: {
              $cond: [
                { $gt: ['$gesamt', 0] },
                { $multiply: [{ $divide: ['$angenommen', '$gesamt'] }, 100] },
                0
              ]
            }
          }
        }
      ]).toArray()
    ])
    
    // Angebote aggregieren
    const angebote = {
      gesamt: angebotStats.reduce((sum, a) => sum + a.anzahl, 0),
      angenommen: angebotStats.find(a => a._id === 'angenommen')?.anzahl || 0,
      abgelehnt: angebotStats.find(a => a._id === 'abgelehnt')?.anzahl || 0,
      ausstehend: angebotStats.filter(a => ['entwurf', 'gesendet'].includes(a._id)).reduce((sum, a) => sum + a.anzahl, 0),
      gesamtWert: angebotStats.reduce((sum, a) => sum + a.gesamtWert, 0),
      angenommenWert: angebotStats.find(a => a._id === 'angenommen')?.gesamtWert || 0,
      abgelehntWert: angebotStats.find(a => a._id === 'abgelehnt')?.gesamtWert || 0
    }
    
    // Angebotsquote
    const angebotsquote = angebote.gesamt > 0
      ? (angebote.angenommen / angebote.gesamt) * 100
      : 0
    
    // Durchschnittlicher Angebotswert
    const durchschnittlicherWert = angebote.gesamt > 0
      ? angebote.gesamtWert / angebote.gesamt
      : 0
    
    // Erfolgsrate Trend (pro Monat)
    const erfolgsrateTrend = angeboteProMonat.map((a: any) => ({
      monat: a._id,
      erfolgsrate: a.anzahl > 0 ? (a.angenommen / a.anzahl) * 100 : 0
    }))
    
    // Durchschnittliche Bearbeitungszeit
    const angeboteMitDaten = await db.collection<Angebot>('angebote')
      .find({
        datum: { $gte: von, $lte: bis },
        $or: [
          { angenommenAm: { $exists: true } },
          { abgelehntAm: { $exists: true } }
        ]
      })
      .toArray()
    
    const bearbeitungszeiten = angeboteMitDaten.map(a => {
      const erstellt = new Date(a.datum)
      const entschieden = a.angenommenAm 
        ? new Date(a.angenommenAm)
        : (a.abgelehntAm ? new Date(a.abgelehntAm) : null)
      
      if (!entschieden) return 0
      
      return Math.ceil((entschieden.getTime() - erstellt.getTime()) / (1000 * 60 * 60 * 24))
    }).filter(d => d > 0)
    
    const durchschnittlicheBearbeitungszeit = bearbeitungszeiten.length > 0
      ? bearbeitungszeiten.reduce((sum, d) => sum + d, 0) / bearbeitungszeiten.length
      : 0
    
    // Top-Angebote nach Wert
    const topAngebote = await db.collection<Angebot>('angebote')
      .find({
        datum: { $gte: von, $lte: bis }
      })
      .sort({ brutto: -1 })
      .limit(10)
      .toArray()
    
    // KPIs
    const overview = [
      {
        id: 'gesamt-angebote',
        titel: 'Gesamt Angebote',
        wert: angebote.gesamt,
        format: 'number'
      },
      {
        id: 'angenommen',
        titel: 'Angenommen',
        wert: angebote.angenommen,
        format: 'number',
        untertitel: `${angebotsquote.toFixed(1)}% Quote`
      },
      {
        id: 'angebotsquote',
        titel: 'Angebotsquote',
        wert: angebotsquote,
        format: 'percent'
      },
      {
        id: 'durchschnitt-wert',
        titel: 'Ø Angebotswert',
        wert: durchschnittlicherWert,
        format: 'currency'
      },
      {
        id: 'angenommen-wert',
        titel: 'Angenommener Wert',
        wert: angebote.angenommenWert,
        format: 'currency'
      },
      {
        id: 'bearbeitungszeit',
        titel: 'Ø Bearbeitungszeit',
        wert: durchschnittlicheBearbeitungszeit.toFixed(1),
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
            id: 'angebote-pro-monat',
            typ: 'bar',
            titel: 'Angebote pro Monat',
            daten: angeboteProMonat.map((a: any) => ({
              monat: a._id,
              anzahl: a.anzahl,
              gesamtWert: a.gesamtWert,
              angenommen: a.angenommen,
              angenommenWert: a.angenommenWert
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
            id: 'erfolgsrate-trend',
            typ: 'line',
            titel: 'Erfolgsrate Trend',
            daten: erfolgsrateTrend
          }
        ],
        tables: [
          {
            id: 'erfolgsrate-kunde',
            titel: 'Erfolgsrate nach Kunde',
            daten: erfolgsrateKunde.map((e: any) => ({
              kundeName: e.kundeName,
              gesamt: e.gesamt,
              angenommen: e.angenommen,
              erfolgsrate: e.erfolgsrate.toFixed(1)
            }))
          },
          {
            id: 'erfolgsrate-typ',
            titel: 'Erfolgsrate nach Projekttyp',
            daten: erfolgsrateTyp.map((e: any) => ({
              typ: e.typ || 'Nicht angegeben',
              gesamt: e.gesamt,
              angenommen: e.angenommen,
              erfolgsrate: e.erfolgsrate.toFixed(1)
            }))
          },
          {
            id: 'top-angebote',
            titel: 'Top Angebote nach Wert',
            daten: topAngebote.map(a => ({
              angebotsnummer: a.angebotsnummer,
              kundeName: a.kundeName,
              datum: new Date(a.datum).toISOString(),
              brutto: a.brutto,
              status: a.status
            }))
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
    console.error('[GET /api/statistiken/angebote] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Angebots-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
