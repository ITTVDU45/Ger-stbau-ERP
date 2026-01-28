/**
 * GET /api/statistiken/mitarbeiter
 * 
 * API für Mitarbeiter-Statistiken (Übersicht alle Mitarbeiter)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { Mitarbeiter, Zeiterfassung, Einsatz, Urlaub } from '@/lib/db/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vonParam = searchParams.get('von')
    const bisParam = searchParams.get('bis')
    const mitarbeiterId = searchParams.get('mitarbeiterId')
    
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
    
    // Filter für Mitarbeiter
    const mitarbeiterFilter: any = { aktiv: true }
    if (mitarbeiterId) {
      mitarbeiterFilter._id = mitarbeiterId
    }
    
    // Alle aktiven Mitarbeiter laden
    const mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter')
      .find(mitarbeiterFilter)
      .toArray()
    
    // Für jeden Mitarbeiter Statistiken berechnen
    const mitarbeiterStats = await Promise.all(
      mitarbeiter.map(async (ma) => {
        const maId = ma._id?.toString() || ''
        
        // Parallele Abfragen für bessere Performance
        const [
          zeiterfassungStats,
          einsatzStats,
          urlaubStats,
          projekteStats
        ] = await Promise.all([
          // 1. Arbeitsstunden aus Zeiterfassung
          db.collection<Zeiterfassung>('zeiterfassung').aggregate([
            {
              $match: {
                mitarbeiterId: maId,
                datum: { $gte: von, $lte: bis },
                status: { $ne: 'abgelehnt' }
              }
            },
            {
              $group: {
                _id: null,
                gesamtStunden: { $sum: '$stunden' },
                anzahlEintraege: { $sum: 1 },
                proMonat: {
                  $push: {
                    monat: { $dateToString: { format: '%Y-%m', date: '$datum' } },
                    stunden: '$stunden'
                  }
                }
              }
            }
          ]).toArray(),
          
          // 2. Einsätze
          db.collection<Einsatz>('einsatz').aggregate([
            {
              $match: {
                mitarbeiterId: maId,
                von: { $lte: bis },
                bis: { $gte: von }
              }
            },
            {
              $group: {
                _id: null,
                anzahl: { $sum: 1 },
                bestaetigt: {
                  $sum: { $cond: ['$bestaetigt', 1, 0] }
                },
                geplant: {
                  $sum: { $cond: [{ $not: '$bestaetigt' }, 1, 0] }
                }
              }
            }
          ]).toArray(),
          
          // 3. Urlaubstage
          db.collection<Urlaub>('urlaub').aggregate([
            {
              $match: {
                mitarbeiterId: maId,
                status: 'genehmigt'
              }
            },
            {
              $group: {
                _id: '$typ',
                tage: {
                  $sum: {
                    $cond: [
                      { $eq: [{ $type: '$von' }, 'date'] },
                      {
                        $add: [
                          1,
                          {
                            $divide: [
                              { $subtract: ['$bis', '$von'] },
                              1000 * 60 * 60 * 24
                            ]
                          }
                        ]
                      },
                      {
                        $cond: [
                          { $eq: ['$vonType', 'string'] },
                          {
                            $add: [
                              1,
                              {
                                $divide: [
                                  { $subtract: [
                                    { $dateFromString: { dateString: '$bis', onError: new Date() } },
                                    { $dateFromString: { dateString: '$von', onError: new Date() } }
                                  ]},
                                  1000 * 60 * 60 * 24
                                ]
                              }
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
          ]).toArray(),
          
          // 4. Projekte (aus Einsätzen)
          db.collection<Einsatz>('einsatz').aggregate([
            {
              $match: {
                mitarbeiterId: maId,
                von: { $lte: bis },
                bis: { $gte: von }
              }
            },
            {
              $group: {
                _id: '$projektId',
                projektName: { $first: '$projektName' },
                anzahlEinsaetze: { $sum: 1 }
              }
            },
            { $count: 'anzahl' }
          ]).toArray()
        ])
        
        const zeiterfassung = zeiterfassungStats[0] || { gesamtStunden: 0, anzahlEintraege: 0, proMonat: [] }
        const einsatz = einsatzStats[0] || { anzahl: 0, bestaetigt: 0, geplant: 0 }
        const urlaub = urlaubStats.reduce((acc, u) => {
          acc[u._id] = u.tage
          return acc
        }, {} as Record<string, number>)
        const projekte = projekteStats[0]?.anzahl || 0
        
        // Stunden pro Monat aggregieren
        const stundenProMonat = zeiterfassung.proMonat.reduce((acc: Record<string, number>, item: any) => {
          const monat = item.monat
          acc[monat] = (acc[monat] || 0) + item.stunden
          return acc
        }, {})
        
        // Auslastung berechnen (basierend auf wochenarbeitsstunden)
        const wochenstunden = ma.wochenarbeitsstunden || 40
        const monatsstunden = (wochenstunden * 4.33) // Durchschnittliche Wochen pro Monat
        const auslastung = monatsstunden > 0 
          ? (zeiterfassung.gesamtStunden / monatsstunden) * 100 
          : 0
        
        // Urlaubstage aggregieren
        const urlaubstage = urlaub['urlaub'] || 0
        const krankheitstage = urlaub['krankheit'] || 0
        const sonderurlaub = urlaub['sonderurlaub'] || 0
        const verbrauchteTage = urlaubstage + krankheitstage + sonderurlaub
        const verbleibendeTage = (ma.jahresUrlaubstage || 0) - verbrauchteTage
        
        // Durchschnittliche Einsatzdauer (in Tagen)
        const einsaetze = await db.collection<Einsatz>('einsatz')
          .find({
            mitarbeiterId: maId,
            von: { $lte: bis },
            bis: { $gte: von }
          })
          .toArray()
        
        const durchschnittlicheDauer = einsaetze.length > 0
          ? einsaetze.reduce((sum, e) => {
              const start = new Date(e.von)
              const end = new Date(e.bis)
              const tage = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
              return sum + tage
            }, 0) / einsaetze.length
          : 0
        
        return {
          mitarbeiterId: maId,
          mitarbeiterName: `${ma.vorname} ${ma.nachname}`,
          personalnummer: ma.personalnummer,
          arbeitsstunden: {
            gesamt: zeiterfassung.gesamtStunden,
            proMonat: Object.entries(stundenProMonat).map(([monat, stunden]) => ({
              monat,
              stunden: stunden as number
            })),
            anzahlEintraege: zeiterfassung.anzahlEintraege
          },
          einsaetze: {
            anzahl: einsatz.anzahl,
            bestaetigt: einsatz.bestaetigt,
            geplant: einsatz.geplant
          },
          urlaub: {
            verbraucht: verbrauchteTage,
            verbleibend: verbleibendeTage,
            geplant: ma.jahresUrlaubstage || 0,
            urlaubstage,
            krankheitstage,
            sonderurlaub
          },
          projekte: {
            anzahl: projekte,
            aktiv: projekte // Vereinfacht: alle Projekte im Zeitraum als aktiv betrachtet
          },
          auslastung: Math.min(100, Math.max(0, auslastung)),
          durchschnittlicheEinsatzdauer: durchschnittlicheDauer
        }
      })
    )
    
    // Aggregierte Charts-Daten
    const stundenProMonatChart = mitarbeiterStats.reduce((acc, stat) => {
      stat.arbeitsstunden.proMonat.forEach((item: any) => {
        if (!acc[item.monat]) {
          acc[item.monat] = 0
        }
        acc[item.monat] += item.stunden
      })
      return acc
    }, {} as Record<string, number>)
    
    const auslastungChart = mitarbeiterStats.map(stat => ({
      name: stat.mitarbeiterName,
      wert: stat.auslastung
    }))
    
    const urlaubsverteilungChart = mitarbeiterStats.map(stat => ({
      name: stat.mitarbeiterName,
      verbraucht: stat.urlaub.verbraucht,
      verbleibend: stat.urlaub.verbleibend
    }))
    
    // Top-Mitarbeiter nach Stunden
    const topMitarbeiter = [...mitarbeiterStats]
      .sort((a, b) => b.arbeitsstunden.gesamt - a.arbeitsstunden.gesamt)
      .slice(0, 10)
      .map(stat => ({
        mitarbeiterId: stat.mitarbeiterId,
        name: stat.mitarbeiterName,
        stunden: stat.arbeitsstunden.gesamt,
        einsaetze: stat.einsaetze.anzahl,
        auslastung: stat.auslastung
      }))
    
    // KPIs
    const overview = [
      {
        id: 'gesamtstunden',
        titel: 'Gesamtstunden',
        wert: mitarbeiterStats.reduce((sum, s) => sum + s.arbeitsstunden.gesamt, 0),
        format: 'number'
      },
      {
        id: 'durchschnitt-auslastung',
        titel: 'Durchschnittliche Auslastung',
        wert: mitarbeiterStats.length > 0
          ? mitarbeiterStats.reduce((sum, s) => sum + s.auslastung, 0) / mitarbeiterStats.length
          : 0,
        format: 'percent'
      },
      {
        id: 'gesamt-urlaubstage',
        titel: 'Verbrauchte Urlaubstage',
        wert: mitarbeiterStats.reduce((sum, s) => sum + s.urlaub.verbraucht, 0),
        format: 'number'
      }
    ]
    
    return NextResponse.json({
      erfolg: true,
      data: {
        overview,
        mitarbeiter: mitarbeiterStats,
        charts: [
          {
            id: 'stunden-pro-monat',
            typ: 'line',
            titel: 'Arbeitsstunden pro Monat',
            daten: Object.entries(stundenProMonatChart).map(([monat, stunden]) => ({
              monat,
              stunden
            })).sort((a, b) => a.monat.localeCompare(b.monat))
          },
          {
            id: 'auslastung',
            typ: 'bar',
            titel: 'Auslastung nach Mitarbeiter',
            daten: auslastungChart
          },
          {
            id: 'urlaubsverteilung',
            typ: 'pie',
            titel: 'Urlaubsverteilung',
            daten: urlaubsverteilungChart
          }
        ],
        tables: [
          {
            id: 'top-mitarbeiter',
            titel: 'Top Mitarbeiter nach Stunden',
            daten: topMitarbeiter
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
    console.error('[GET /api/statistiken/mitarbeiter] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Mitarbeiter-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
