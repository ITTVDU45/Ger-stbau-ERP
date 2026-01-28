/**
 * GET /api/statistiken/overview
 * 
 * Zentrale API für Übersichts-KPIs der Statistik-Seite
 * Liefert aggregierte Daten für Dashboard-Übersicht
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns'

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
      // Default: Aktueller Monat
      von = startOfMonth(heute)
      bis = endOfMonth(heute)
    }
    
    // Vergleichszeitraum (Vorjahr für Trends)
    const vorjahrVon = startOfYear(subYears(heute, 1))
    const vorjahrBis = endOfYear(subYears(heute, 1))
    const vorjahresMonatVon = startOfMonth(subMonths(heute, 12))
    const vorjahresMonatBis = endOfMonth(subMonths(heute, 12))
    
    // Parallele Aggregationen für bessere Performance
    const [
      umsatzStats,
      projektStats,
      mitarbeiterStats,
      rechnungStats,
      angebotStats,
      urlaubStats
    ] = await Promise.all([
      // 1. Gesamtumsatz (aus Rechnungen)
      db.collection('rechnungen').aggregate([
        {
          $match: {
            status: { $in: ['bezahlt', 'teilbezahlt'] },
            bezahltAm: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: null,
            gesamt: { $sum: '$brutto' },
            anzahl: { $sum: 1 }
          }
        }
      ]).toArray(),
      
      // Vergleich: Vorjahresmonat
      db.collection('rechnungen').aggregate([
        {
          $match: {
            status: { $in: ['bezahlt', 'teilbezahlt'] },
            bezahltAm: { $gte: vorjahresMonatVon, $lte: vorjahresMonatBis }
          }
        },
        {
          $group: {
            _id: null,
            gesamt: { $sum: '$brutto' }
          }
        }
      ]).toArray(),
      
      // 2. Anzahl aktive Projekte
      db.collection('projekte').countDocuments({
        status: { $in: ['aktiv', 'in_planung'] }
      }),
      
      // 3. Anzahl aktive Mitarbeiter
      db.collection('mitarbeiter').countDocuments({
        aktiv: true
      }),
      
      // 4. Offene Rechnungen
      db.collection('rechnungen').aggregate([
        {
          $match: {
            status: { $in: ['gesendet', 'ueberfaellig', 'teilbezahlt'] }
          }
        },
        {
          $group: {
            _id: null,
            anzahl: { $sum: 1 },
            summe: { $sum: '$brutto' },
            offenerBetrag: { $sum: { $subtract: ['$brutto', { $ifNull: ['$bezahltBetrag', 0] }] } }
          }
        }
      ]).toArray(),
      
      // 5. Offene Angebote
      db.collection('angebote').aggregate([
        {
          $match: {
            status: { $in: ['entwurf', 'gesendet'] }
          }
        },
        {
          $group: {
            _id: null,
            anzahl: { $sum: 1 },
            gesamtWert: { $sum: '$brutto' }
          }
        }
      ]).toArray(),
      
      // 6. Urlaubstage
      db.collection('urlaub').aggregate([
        {
          $match: {
            status: 'genehmigt',
            typ: 'urlaub'
          }
        },
        {
          $group: {
            _id: null,
            verbrauchteTage: {
              $sum: {
                $cond: [
                  { $eq: [{ $type: '$von' }, 'date'] },
                  {
                    $divide: [
                      { $subtract: ['$bis', '$von'] },
                      1000 * 60 * 60 * 24
                    ]
                  },
                  {
                    $cond: [
                      { $eq: ['$vonType', 'string'] },
                      {
                        $divide: [
                          { $subtract: [
                            { $dateFromString: { dateString: '$bis' } },
                            { $dateFromString: { dateString: '$von' } }
                          ]},
                          1000 * 60 * 60 * 24
                        ]
                      },
                      0
                    ]
                  }
                ]
              }
            }
          }
        }
      ]).toArray()
    ])
    
    // Daten extrahieren und formatieren
    const umsatzAktuell = umsatzStats[0]?.gesamt || 0
    const umsatzVorjahr = umsatzStats[1]?.gesamt || 0
    const umsatzTrend = umsatzVorjahr > 0 
      ? ((umsatzAktuell - umsatzVorjahr) / umsatzVorjahr) * 100 
      : 0
    
    const offeneRechnungen = rechnungStats[0] || { anzahl: 0, summe: 0, offenerBetrag: 0 }
    const offeneAngebote = angebotStats[0] || { anzahl: 0, gesamtWert: 0 }
    const urlaubDaten = urlaubStats[0] || { verbrauchteTage: 0 }
    
    // Gesamt-Urlaubstage berechnen (aus Mitarbeiter-Daten)
    const mitarbeiterMitUrlaub = await db.collection('mitarbeiter')
      .find({ aktiv: true, jahresUrlaubstage: { $exists: true, $gt: 0 } })
      .toArray()
    
    const gesamtUrlaubstage = mitarbeiterMitUrlaub.reduce(
      (sum, m) => sum + (m.jahresUrlaubstage || 0),
      0
    )
    
    const verbleibendeUrlaubstage = gesamtUrlaubstage - (urlaubDaten.verbrauchteTage || 0)
    
    // Charts-Daten sammeln
    const [
      umsatzProMonat,
      projektstatusVerteilung,
      mitarbeiterAuslastung,
      einnahmenAusgaben,
      topProjekte,
      topKunden,
      topMitarbeiter,
      ueberfaelligeRechnungen
    ] = await Promise.all([
      // 1. Umsatz pro Monat (Line Chart)
      db.collection('rechnungen').aggregate([
        {
          $match: {
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
      ]).toArray(),
      
      // 2. Projektstatus-Verteilung (Pie Chart)
      db.collection('projekte').aggregate([
        {
          $group: {
            _id: '$status',
            anzahl: { $sum: 1 }
          }
        }
      ]).toArray(),
      
      // 3. Mitarbeiter-Auslastung (Bar Chart)
      db.collection('mitarbeiter').aggregate([
        {
          $match: { aktiv: true }
        },
        {
          $lookup: {
            from: 'zeiterfassung',
            let: { mitarbeiterIdStr: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$mitarbeiterId', '$$mitarbeiterIdStr'] },
                  datum: { $gte: von, $lte: bis },
                  status: { $ne: 'abgelehnt' }
                }
              },
              {
                $group: {
                  _id: null,
                  stunden: { $sum: '$stunden' }
                }
              }
            ],
            as: 'zeiterfassungen'
          }
        },
        {
          $project: {
            name: { $concat: ['$vorname', ' ', '$nachname'] },
            wochenstunden: { $ifNull: ['$wochenarbeitsstunden', 40] },
            stunden: { $ifNull: [{ $arrayElemAt: ['$zeiterfassungen.stunden', 0] }, 0] }
          }
        },
        {
          $project: {
            name: 1,
            auslastung: {
              $cond: [
                { $gt: ['$wochenstunden', 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        '$stunden',
                        { $multiply: ['$wochenstunden', 4.33] }
                      ]
                    },
                    100
                  ]
                },
                0
              ]
            }
          }
        },
        { $sort: { auslastung: -1 } },
        { $limit: 10 }
      ]).toArray(),
      
      // 4. Einnahmen vs. Ausgaben (Area Chart)
      db.collection('transaktionen').aggregate([
        {
          $match: {
            datum: { $gte: von, $lte: bis },
            status: { $ne: 'storniert' }
          }
        },
        {
          $group: {
            _id: {
              monat: { $dateToString: { format: '%Y-%m', date: '$datum' } },
              typ: '$typ'
            },
            summe: { $sum: '$betrag' }
          }
        },
        { $sort: { '_id.monat': 1 } }
      ]).toArray(),
      
      // 5. Top-Projekte nach Umsatz
      db.collection('rechnungen').aggregate([
        {
          $match: {
            projektId: { $exists: true, $ne: null },
            status: { $in: ['bezahlt', 'teilbezahlt'] },
            bezahltAm: { $gte: von, $lte: bis }
          }
        },
        {
          $group: {
            _id: '$projektId',
            projektName: { $first: '$projektName' },
            umsatz: { $sum: '$brutto' }
          }
        },
        { $sort: { umsatz: -1 } },
        { $limit: 10 }
      ]).toArray(),
      
      // 6. Top-Kunden nach Umsatz
      db.collection('rechnungen').aggregate([
        {
          $match: {
            kundeId: { $exists: true, $ne: null },
            status: { $in: ['bezahlt', 'teilbezahlt'] },
            bezahltAm: { $gte: von, $lte: bis }
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
        { $limit: 10 }
      ]).toArray(),
      
      // 7. Top-Mitarbeiter nach Arbeitsstunden
      db.collection('zeiterfassung').aggregate([
        {
          $match: {
            datum: { $gte: von, $lte: bis },
            status: { $ne: 'abgelehnt' }
          }
        },
        {
          $group: {
            _id: '$mitarbeiterId',
            mitarbeiterName: { $first: '$mitarbeiterName' },
            stunden: { $sum: '$stunden' }
          }
        },
        { $sort: { stunden: -1 } },
        { $limit: 10 }
      ]).toArray(),
      
      // 8. Überfällige Rechnungen
      db.collection('rechnungen')
        .find({
          status: 'ueberfaellig',
          faelligAm: { $lt: heute }
        })
        .sort({ faelligAm: 1 })
        .limit(10)
        .toArray()
    ])
    
    // Charts-Daten formatieren
    const charts = [
      {
        id: 'umsatz-pro-monat',
        typ: 'line',
        titel: 'Umsatz pro Monat',
        daten: (umsatzProMonat || []).map((item: any) => ({
          monat: item._id,
          umsatz: item.summe || 0
        }))
      },
      {
        id: 'projektstatus',
        typ: 'pie',
        titel: 'Projektstatus-Verteilung',
        daten: (projektstatusVerteilung || []).map((item: any) => ({
          name: item._id || 'Unbekannt',
          wert: item.anzahl || 0
        }))
      },
      {
        id: 'mitarbeiter-auslastung',
        typ: 'bar',
        titel: 'Mitarbeiter-Auslastung (Top 10)',
        daten: (mitarbeiterAuslastung || []).map((item: any) => ({
          name: item.name || 'Unbekannt',
          auslastung: Math.min(100, Math.max(0, item.auslastung || 0))
        }))
      },
      {
        id: 'einnahmen-ausgaben',
        typ: 'area',
        titel: 'Einnahmen vs. Ausgaben',
        daten: (() => {
          if (!einnahmenAusgaben || einnahmenAusgaben.length === 0) {
            return []
          }
          
          const monate = new Set<string>()
          einnahmenAusgaben.forEach((item: any) => {
            if (item._id?.monat) {
              monate.add(item._id.monat)
            }
          })
          
          if (monate.size === 0) {
            return []
          }
          
          return Array.from(monate).sort().map(monat => {
            const einnahmen = einnahmenAusgaben
              .filter((item: any) => item._id?.monat === monat && item._id?.typ === 'einnahme')
              .reduce((sum: number, item: any) => sum + (item.summe || 0), 0)
            const ausgaben = einnahmenAusgaben
              .filter((item: any) => item._id?.monat === monat && item._id?.typ === 'ausgabe')
              .reduce((sum: number, item: any) => sum + (item.summe || 0), 0)
            
            return {
              monat,
              einnahmen,
              ausgaben
            }
          })
        })()
      }
    ]
    
    // Tabellen-Daten formatieren
    const tables = [
      {
        id: 'top-projekte',
        titel: 'Top Projekte nach Umsatz',
        daten: (topProjekte || []).map((item: any) => ({
          projektId: item._id,
          projektName: item.projektName || 'Unbekannt',
          umsatz: item.umsatz || 0
        }))
      },
      {
        id: 'top-kunden',
        titel: 'Top Kunden nach Umsatz',
        daten: (topKunden || []).map((item: any) => ({
          kundeId: item._id,
          kundeName: item.kundeName || 'Unbekannt',
          umsatz: item.umsatz || 0
        }))
      },
      {
        id: 'top-mitarbeiter',
        titel: 'Top Mitarbeiter nach Arbeitsstunden',
        daten: (topMitarbeiter || []).map((item: any) => ({
          mitarbeiterId: item._id,
          mitarbeiterName: item.mitarbeiterName || 'Unbekannt',
          stunden: item.stunden || 0
        }))
      },
      {
        id: 'ueberfaellige-rechnungen',
        titel: 'Überfällige Rechnungen',
        daten: (ueberfaelligeRechnungen || []).map((r: any) => ({
          rechnungsnummer: r.rechnungsnummer || 'N/A',
          kundeName: r.kundeName || 'Unbekannt',
          faelligAm: r.faelligAm instanceof Date ? r.faelligAm.toISOString() : (r.faelligAm ? new Date(r.faelligAm).toISOString() : new Date().toISOString()),
          brutto: r.brutto || 0,
          offenerBetrag: (r.brutto || 0) - (r.bezahltBetrag || 0)
        }))
      }
    ]
    
    // KPIs zusammenstellen
    const overview = [
      {
        id: 'umsatz',
        titel: 'Gesamtumsatz',
        wert: umsatzAktuell,
        format: 'currency',
        trend: umsatzTrend,
        vergleich: `Vorjahresmonat: ${umsatzVorjahr.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`
      },
      {
        id: 'aktive-projekte',
        titel: 'Aktive Projekte',
        wert: projektStats,
        format: 'number',
        vergleich: null
      },
      {
        id: 'aktive-mitarbeiter',
        titel: 'Aktive Mitarbeiter',
        wert: mitarbeiterStats,
        format: 'number',
        vergleich: null
      },
      {
        id: 'offene-rechnungen',
        titel: 'Offene Rechnungen',
        wert: offeneRechnungen.anzahl,
        format: 'number',
        untertitel: `${offeneRechnungen.offenerBetrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} offen`,
        vergleich: null
      },
      {
        id: 'offene-angebote',
        titel: 'Offene Angebote',
        wert: offeneAngebote.anzahl,
        format: 'number',
        untertitel: `${offeneAngebote.gesamtWert.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} Wert`,
        vergleich: null
      },
      {
        id: 'urlaubstage',
        titel: 'Urlaubstage',
        wert: `${urlaubDaten.verbrauchteTage.toFixed(0)} / ${gesamtUrlaubstage}`,
        format: 'text',
        untertitel: `${verbleibendeUrlaubstage.toFixed(0)} verbleibend`,
        vergleich: null
      }
    ]
    
    return NextResponse.json({
      erfolg: true,
      data: {
        overview,
        charts,
        tables
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
    console.error('[GET /api/statistiken/overview] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Übersichts-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
