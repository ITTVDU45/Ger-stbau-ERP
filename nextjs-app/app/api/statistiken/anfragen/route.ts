/**
 * GET /api/statistiken/anfragen
 * 
 * API für Anfrage-Statistiken
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfYear, endOfYear } from 'date-fns'
import { Anfrage, Angebot } from '@/lib/db/types'

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
      anfrageStats,
      anfragenProMonat,
      statusVerteilung,
      konversionsrate
    ] = await Promise.all([
      // 1. Anfragen aggregiert
      db.collection<Anfrage>('anfragen').aggregate([
        {
          $match: {
            erstelltAm: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: '$status',
            anzahl: { $sum: 1 }
          }
        }
      ]).toArray(),
      
      // 2. Anfragen pro Monat
      db.collection<Anfrage>('anfragen').aggregate([
        {
          $match: {
            erstelltAm: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$erstelltAm' } },
            anzahl: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray(),
      
      // 3. Status-Verteilung
      db.collection<Anfrage>('anfragen').aggregate([
        {
          $match: {
            erstelltAm: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: '$status',
            anzahl: { $sum: 1 }
          }
        }
      ]).toArray(),
      
      // 4. Konversionsrate (Anfrage → Angebot → Auftrag)
      db.collection<Anfrage>('anfragen').aggregate([
        {
          $match: {
            erstelltAm: { $gte: von, $lte: bis }
          }
        },
        {
          $lookup: {
            from: 'angebote',
            localField: 'angebotId',
            foreignField: '_id',
            as: 'angebot'
          }
        },
        {
          $lookup: {
            from: 'projekte',
            localField: 'projektId',
            foreignField: '_id',
            as: 'projekt'
          }
        },
        {
          $project: {
            status: 1,
            angebotId: 1,
            projektId: 1,
            hatAngebot: { $gt: [{ $size: '$angebot' }, 0] },
            hatProjekt: { $gt: [{ $size: '$projekt' }, 0] }
          }
        },
        {
          $group: {
            _id: null,
            gesamt: { $sum: 1 },
            zuAngebot: {
              $sum: { $cond: ['$hatAngebot', 1, 0] }
            },
            zuAuftrag: {
              $sum: { $cond: ['$hatProjekt', 1, 0] }
            }
          }
        }
      ]).toArray()
    ])
    
    // Anfragen aggregieren
    const anfragen = {
      gesamt: anfrageStats.reduce((sum, a) => sum + a.anzahl, 0),
      neu: anfrageStats.find(a => a._id === 'offen')?.anzahl || 0,
      inBearbeitung: anfrageStats.find(a => a._id === 'in_bearbeitung')?.anzahl || 0,
      zuAngebot: anfrageStats.find(a => a._id === 'angebot_in_bearbeitung' || a._id === 'angebot_erstellt')?.anzahl || 0,
      abgelehnt: anfrageStats.find(a => a._id === 'abgelehnt')?.anzahl || 0
    }
    
    // Konversionsrate
    const konversionsDaten = konversionsrate[0] || { gesamt: 0, zuAngebot: 0, zuAuftrag: 0 }
    const quoteAngebot = konversionsDaten.gesamt > 0
      ? (konversionsDaten.zuAngebot / konversionsDaten.gesamt) * 100
      : 0
    const quoteAuftrag = konversionsDaten.gesamt > 0
      ? (konversionsDaten.zuAuftrag / konversionsDaten.gesamt) * 100
      : 0
    
    // Durchschnittliche Bearbeitungszeit
    const anfragenMitDaten = await db.collection<Anfrage>('anfragen')
      .find({
        erstelltAm: { $gte: von, $lte: bis },
        $or: [
          { angebotId: { $exists: true, $ne: null } },
          { projektId: { $exists: true, $ne: null } }
        ]
      })
      .toArray()
    
    const bearbeitungszeiten = await Promise.all(
      anfragenMitDaten.map(async (a) => {
        const erstellt = new Date(a.erstelltAm)
        let entschieden: Date | null = null
        
        if (a.projektId) {
          const projekt = await db.collection('projekte').findOne({ _id: a.projektId })
          if (projekt?.erstelltAm) {
            entschieden = new Date(projekt.erstelltAm)
          }
        } else if (a.angebotId) {
          const angebot = await db.collection<Angebot>('angebote').findOne({ _id: a.angebotId })
          if (angebot?.datum) {
            entschieden = new Date(angebot.datum)
          }
        }
        
        if (!entschieden) return 0
        
        return Math.ceil((entschieden.getTime() - erstellt.getTime()) / (1000 * 60 * 60 * 24))
      })
    )
    
    const durchschnittlicheBearbeitungszeit = bearbeitungszeiten.filter(d => d > 0).length > 0
      ? bearbeitungszeiten.filter(d => d > 0).reduce((sum, d) => sum + d, 0) / bearbeitungszeiten.filter(d => d > 0).length
      : 0
    
    // Top-Anfragen (nach Wert - geschätzt aus zugehörigen Angeboten)
    const topAnfragen = await db.collection<Anfrage>('anfragen')
      .aggregate([
        {
          $match: {
            erstelltAm: { $gte: von, $lte: bis },
            angebotId: { $exists: true, $ne: null }
          }
        },
        {
          $lookup: {
            from: 'angebote',
            localField: 'angebotId',
            foreignField: '_id',
            as: 'angebot'
          }
        },
        {
          $unwind: {
            path: '$angebot',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            anfragenummer: 1,
            kundeName: 1,
            erstelltAm: 1,
            status: 1,
            wert: { $ifNull: ['$angebot.brutto', 0] }
          }
        },
        { $sort: { wert: -1 } },
        { $limit: 10 }
      ])
      .toArray()
    
    // Funnel Chart Daten (Konversionsrate)
    const funnelDaten = [
      {
        stufe: 'Anfrage',
        anzahl: konversionsDaten.gesamt,
        prozent: 100
      },
      {
        stufe: 'Zu Angebot',
        anzahl: konversionsDaten.zuAngebot,
        prozent: quoteAngebot
      },
      {
        stufe: 'Zu Auftrag',
        anzahl: konversionsDaten.zuAuftrag,
        prozent: quoteAuftrag
      }
    ]
    
    // KPIs
    const overview = [
      {
        id: 'gesamt-anfragen',
        titel: 'Gesamt Anfragen',
        wert: anfragen.gesamt,
        format: 'number'
      },
      {
        id: 'zu-angebot',
        titel: 'Zu Angebot',
        wert: konversionsDaten.zuAngebot,
        format: 'number',
        untertitel: `${quoteAngebot.toFixed(1)}% Quote`
      },
      {
        id: 'zu-auftrag',
        titel: 'Zu Auftrag',
        wert: konversionsDaten.zuAuftrag,
        format: 'number',
        untertitel: `${quoteAuftrag.toFixed(1)}% Quote`
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
            id: 'anfragen-pro-monat',
            typ: 'bar',
            titel: 'Anfragen pro Monat',
            daten: anfragenProMonat.map((a: any) => ({
              monat: a._id,
              anzahl: a.anzahl
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
            id: 'konversionsrate',
            typ: 'bar',
            titel: 'Konversionsrate (Funnel)',
            daten: funnelDaten
          }
        ],
        tables: [
          {
            id: 'top-anfragen',
            titel: 'Top Anfragen',
            daten: topAnfragen.map((a: any) => ({
              anfragenummer: a.anfragenummer,
              kundeName: a.kundeName,
              erstelltAm: new Date(a.erstelltAm).toISOString(),
              status: a.status,
              wert: a.wert
            }))
          }
        ],
        konversionsrate: {
          gesamt: konversionsDaten.gesamt,
          zuAngebot: konversionsDaten.zuAngebot,
          zuAuftrag: konversionsDaten.zuAuftrag,
          quoteAngebot,
          quoteAuftrag
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
    console.error('[GET /api/statistiken/anfragen] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Anfrage-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
