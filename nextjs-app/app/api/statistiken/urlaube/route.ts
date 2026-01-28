/**
 * GET /api/statistiken/urlaube
 * 
 * API für Urlaubs-Statistiken
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format } from 'date-fns'
import { Urlaub, Mitarbeiter, Einsatz } from '@/lib/db/types'

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
      // Default: Aktuelles Jahr
      von = startOfYear(heute)
      bis = endOfYear(heute)
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
    
    // Urlaubsdaten für alle Mitarbeiter laden
    const urlaubDaten = await db.collection<Urlaub>('urlaub')
      .find({
        status: 'genehmigt',
        mitarbeiterId: { $in: mitarbeiter.map(m => m._id?.toString()) }
      })
      .toArray()
    
    // Für jeden Mitarbeiter Urlaubsstatistiken berechnen
    const urlaubStats = await Promise.all(
      mitarbeiter.map(async (ma) => {
        const maId = ma._id?.toString() || ''
        const maUrlaube = urlaubDaten.filter(u => u.mitarbeiterId === maId)
        
        // Urlaubstage nach Typ berechnen
        let urlaubstage = 0
        let krankheitstage = 0
        let sonderurlaub = 0
        
        maUrlaube.forEach((u) => {
          let tage = 0
          
          if (u.vonType === 'string' && u.bisType === 'string') {
            try {
              const start = new Date(u.von as string)
              const end = new Date(u.bis as string)
              tage = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
            } catch {
              tage = 0
            }
          } else if (u.von instanceof Date && u.bis instanceof Date) {
            tage = Math.ceil((u.bis.getTime() - u.von.getTime()) / (1000 * 60 * 60 * 24)) + 1
          }
          
          if (u.typ === 'urlaub') {
            urlaubstage += tage
          } else if (u.typ === 'krankheit') {
            krankheitstage += tage
          } else if (u.typ === 'sonderurlaub') {
            sonderurlaub += tage
          }
        })
        
        const verbrauchteTage = urlaubstage + krankheitstage + sonderurlaub
        const verbleibendeTage = (ma.jahresUrlaubstage || 0) - verbrauchteTage
        
        // Urlaubsauslastung
        const urlaubsauslastung = (ma.jahresUrlaubstage || 0) > 0
          ? (verbrauchteTage / (ma.jahresUrlaubstage || 1)) * 100
          : 0
        
        // Konflikte (Urlaub vs. Einsätze)
        let konflikte = 0
        if (maUrlaube.length > 0) {
          konflikte = await db.collection<Einsatz>('einsatz')
            .countDocuments({
              mitarbeiterId: maId,
              $or: maUrlaube.map(u => {
                const start = u.vonType === 'string' ? new Date(u.von as string) : (u.von instanceof Date ? u.von : new Date())
                const end = u.bisType === 'string' ? new Date(u.bis as string) : (u.bis instanceof Date ? u.bis : new Date())
                return {
                  $or: [
                    { von: { $lte: end, $gte: start } },
                    { bis: { $lte: end, $gte: start } },
                    { von: { $lte: start }, bis: { $gte: end } }
                  ]
                }
              })
            })
        }
        
        return {
          mitarbeiterId: maId,
          mitarbeiterName: `${ma.vorname} ${ma.nachname}`,
          jahresUrlaubstage: ma.jahresUrlaubstage || 0,
          verbrauchteTage,
          verbleibendeTage,
          urlaubstage,
          krankheitstage,
          sonderurlaub,
          urlaubsauslastung,
          konflikte
        }
      })
    )
    
    // Urlaubsverteilung nach Monaten
    const urlaubProMonat = urlaubDaten.reduce((acc, u) => {
      let start: Date
      let end: Date
      
      if (u.vonType === 'string' && u.bisType === 'string') {
        start = new Date(u.von as string)
        end = new Date(u.bis as string)
      } else {
        start = u.von instanceof Date ? u.von : new Date(u.von)
        end = u.bis instanceof Date ? u.bis : new Date(u.bis)
      }
      
      // Für jeden Tag im Urlaub den Monat zählen
      const current = new Date(start)
      while (current <= end) {
        const monat = format(current, 'yyyy-MM')
        acc[monat] = (acc[monat] || 0) + 1
        current.setDate(current.getDate() + 1)
      }
      
      return acc
    }, {} as Record<string, number>)
    
    // Urlaubsverteilung nach Mitarbeitern
    const urlaubProMitarbeiter = urlaubStats.map(stat => ({
      name: stat.mitarbeiterName,
      verbraucht: stat.verbrauchteTage,
      verbleibend: stat.verbleibendeTage
    }))
    
    // Krankheitstage Trend (pro Monat)
    const krankheitProMonat = urlaubDaten
      .filter(u => u.typ === 'krankheit')
      .reduce((acc, u) => {
        let start: Date
        let end: Date
        
        if (u.vonType === 'string' && u.bisType === 'string') {
          start = new Date(u.von as string)
          end = new Date(u.bis as string)
        } else {
          start = u.von instanceof Date ? u.von : new Date(u.von)
          end = u.bis instanceof Date ? u.bis : new Date(u.bis)
        }
        
        const current = new Date(start)
        while (current <= end) {
          const monat = format(current, 'yyyy-MM')
          acc[monat] = (acc[monat] || 0) + 1
          current.setDate(current.getDate() + 1)
        }
        
        return acc
      }, {} as Record<string, number>)
    
    // Gesamtstatistiken
    const gesamtUrlaubstage = urlaubStats.reduce((sum, s) => sum + s.verbrauchteTage, 0)
    const gesamtKrankheitstage = urlaubStats.reduce((sum, s) => sum + s.krankheitstage, 0)
    const gesamtSonderurlaub = urlaubStats.reduce((sum, s) => sum + s.sonderurlaub, 0)
    const gesamtVerbleibend = urlaubStats.reduce((sum, s) => sum + s.verbleibendeTage, 0)
    const durchschnittlicheUrlaubstage = urlaubStats.length > 0
      ? urlaubStats.reduce((sum, s) => sum + s.verbrauchteTage, 0) / urlaubStats.length
      : 0
    
    // KPIs
    const overview = [
      {
        id: 'verbrauchte-tage',
        titel: 'Verbrauchte Urlaubstage',
        wert: gesamtUrlaubstage,
        format: 'number'
      },
      {
        id: 'verbleibende-tage',
        titel: 'Verbleibende Urlaubstage',
        wert: gesamtVerbleibend,
        format: 'number'
      },
      {
        id: 'krankheitstage',
        titel: 'Krankheitstage',
        wert: gesamtKrankheitstage,
        format: 'number'
      },
      {
        id: 'durchschnitt-urlaub',
        titel: 'Ø Urlaubstage pro Mitarbeiter',
        wert: durchschnittlicheUrlaubstage.toFixed(1),
        format: 'text'
      }
    ]
    
    return NextResponse.json({
      erfolg: true,
      data: {
        overview,
        mitarbeiter: urlaubStats,
        charts: [
          {
            id: 'urlaub-pro-monat',
            typ: 'bar',
            titel: 'Urlaubsverteilung nach Monaten',
            daten: Object.entries(urlaubProMonat)
              .map(([monat, tage]) => ({ monat, tage }))
              .sort((a, b) => a.monat.localeCompare(b.monat))
          },
          {
            id: 'urlaub-pro-mitarbeiter',
            typ: 'bar',
            titel: 'Urlaubsverteilung nach Mitarbeitern',
            daten: urlaubProMitarbeiter
          },
          {
            id: 'krankheit-trend',
            typ: 'line',
            titel: 'Krankheitstage Trend',
            daten: Object.entries(krankheitProMonat)
              .map(([monat, tage]) => ({ monat, tage }))
              .sort((a, b) => a.monat.localeCompare(b.monat))
          }
        ],
        tables: [
          {
            id: 'urlaubsuebersicht',
            titel: 'Urlaubsübersicht pro Mitarbeiter',
            daten: urlaubStats.map(stat => ({
              mitarbeiterName: stat.mitarbeiterName,
              jahresUrlaubstage: stat.jahresUrlaubstage,
              verbraucht: stat.verbrauchteTage,
              verbleibend: stat.verbleibendeTage,
              urlaubstage: stat.urlaubstage,
              krankheitstage: stat.krankheitstage,
              sonderurlaub: stat.sonderurlaub,
              urlaubsauslastung: stat.urlaubsauslastung.toFixed(1),
              konflikte: stat.konflikte
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
    console.error('[GET /api/statistiken/urlaube] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Urlaubs-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
