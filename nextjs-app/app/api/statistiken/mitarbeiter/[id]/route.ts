/**
 * GET /api/statistiken/mitarbeiter/[id]
 * 
 * API für detaillierte Statistiken eines einzelnen Mitarbeiters
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { Mitarbeiter, Zeiterfassung, Einsatz, Urlaub } from '@/lib/db/types'
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
        { erfolg: false, fehler: 'Ungültige Mitarbeiter-ID' },
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
    
    // Mitarbeiter laden
    const mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter')
      .findOne({ _id: new ObjectId(id) })
    
    if (!mitarbeiter) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Parallele Abfragen
    const [
      zeiterfassungProMonat,
      zeiterfassungProProjekt,
      einsaetze,
      urlaubDaten,
      projekteListe
    ] = await Promise.all([
      // 1. Stunden pro Monat
      db.collection<Zeiterfassung>('zeiterfassung').aggregate([
        {
          $match: {
            mitarbeiterId: id,
            datum: { $gte: von, $lte: bis },
            status: { $ne: 'abgelehnt' }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$datum' } },
            stunden: { $sum: '$stunden' },
            anzahl: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray(),
      
      // 2. Stunden pro Projekt
      db.collection<Zeiterfassung>('zeiterfassung').aggregate([
        {
          $match: {
            mitarbeiterId: id,
            datum: { $gte: von, $lte: bis },
            status: { $ne: 'abgelehnt' },
            projektId: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$projektId',
            projektName: { $first: '$projektName' },
            stunden: { $sum: '$stunden' },
            anzahl: { $sum: 1 }
          }
        },
        { $sort: { stunden: -1 } }
      ]).toArray(),
      
      // 3. Alle Einsätze im Zeitraum
      db.collection<Einsatz>('einsatz')
        .find({
          mitarbeiterId: id,
          von: { $lte: bis },
          bis: { $gte: von }
        })
        .sort({ von: 1 })
        .toArray(),
      
      // 4. Urlaubsdaten
      db.collection<Urlaub>('urlaub')
        .find({
          mitarbeiterId: id,
          status: 'genehmigt'
        })
        .sort({ von: 1 })
        .toArray(),
      
      // 5. Projekte-Liste
      db.collection<Einsatz>('einsatz').aggregate([
        {
          $match: {
            mitarbeiterId: id,
            von: { $lte: bis },
            bis: { $gte: von }
          }
        },
        {
          $group: {
            _id: '$projektId',
            projektName: { $first: '$projektName' },
            anzahlEinsaetze: { $sum: 1 },
            ersteEinsatz: { $min: '$von' },
            letzteEinsatz: { $max: '$bis' }
          }
        }
      ]).toArray()
    ])
    
    // Gesamtstunden berechnen
    const gesamtStunden = zeiterfassungProMonat.reduce((sum, item) => sum + item.stunden, 0)
    
    // Auslastung berechnen
    const wochenstunden = mitarbeiter.wochenarbeitsstunden || 40
    const monate = Math.ceil((bis.getTime() - von.getTime()) / (1000 * 60 * 60 * 24 * 30))
    const sollStunden = wochenstunden * 4.33 * monate
    const auslastung = sollStunden > 0 ? (gesamtStunden / sollStunden) * 100 : 0
    
    // Urlaubstage berechnen
    let verbrauchteTage = 0
    urlaubDaten.forEach((u) => {
      if (u.vonType === 'string' && u.bisType === 'string') {
        const start = new Date(u.von as string)
        const end = new Date(u.bis as string)
        const tage = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        verbrauchteTage += tage
      } else if (u.von instanceof Date && u.bis instanceof Date) {
        const tage = Math.ceil((u.bis.getTime() - u.von.getTime()) / (1000 * 60 * 60 * 24)) + 1
        verbrauchteTage += tage
      }
    })
    
    const verbleibendeTage = (mitarbeiter.jahresUrlaubstage || 0) - verbrauchteTage
    
    // Durchschnittliche Einsatzdauer
    const einsatzDauern = einsaetze.map(e => {
      const start = new Date(e.von)
      const end = new Date(e.bis)
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    })
    const durchschnittlicheDauer = einsatzDauern.length > 0
      ? einsatzDauern.reduce((sum, d) => sum + d, 0) / einsatzDauern.length
      : 0
    
    // Bestätigte vs. geplante Einsätze
    const bestaetigt = einsaetze.filter(e => e.bestaetigt).length
    const geplant = einsaetze.filter(e => !e.bestaetigt).length
    
    // Timeline der Einsätze
    const einsatzTimeline = einsaetze.map(e => ({
      id: e._id?.toString(),
      projektName: e.projektName,
      von: e.von instanceof Date ? e.von.toISOString() : new Date(e.von).toISOString(),
      bis: e.bis instanceof Date ? e.bis.toISOString() : new Date(e.bis).toISOString(),
      bestaetigt: e.bestaetigt,
      rolle: e.rolle
    }))
    
    // Urlaubsübersicht
    const urlaubsUebersicht = urlaubDaten.map(u => ({
      id: u._id?.toString(),
      typ: u.typ,
      von: u.vonType === 'string' ? u.von : (u.von instanceof Date ? u.von.toISOString() : ''),
      bis: u.bisType === 'string' ? u.bis : (u.bis instanceof Date ? u.bis.toISOString() : ''),
      status: u.status
    }))
    
    return NextResponse.json({
      erfolg: true,
      data: {
        mitarbeiter: {
          id: mitarbeiter._id?.toString(),
          name: `${mitarbeiter.vorname} ${mitarbeiter.nachname}`,
          personalnummer: mitarbeiter.personalnummer,
          email: mitarbeiter.email
        },
        overview: [
          {
            id: 'gesamtstunden',
            titel: 'Gesamtstunden',
            wert: gesamtStunden,
            format: 'number'
          },
          {
            id: 'auslastung',
            titel: 'Auslastung',
            wert: auslastung,
            format: 'percent'
          },
          {
            id: 'einsaetze',
            titel: 'Einsätze',
            wert: einsaetze.length,
            format: 'number',
            untertitel: `${bestaetigt} bestätigt, ${geplant} geplant`
          },
          {
            id: 'urlaubstage',
            titel: 'Urlaubstage',
            wert: `${verbrauchteTage} / ${mitarbeiter.jahresUrlaubstage || 0}`,
            format: 'text',
            untertitel: `${verbleibendeTage} verbleibend`
          },
          {
            id: 'projekte',
            titel: 'Projekte',
            wert: projekteListe.length,
            format: 'number'
          },
          {
            id: 'durchschnitt-dauer',
            titel: 'Ø Einsatzdauer',
            wert: durchschnittlicheDauer.toFixed(1),
            format: 'text',
            untertitel: 'Tage'
          }
        ],
        charts: [
          {
            id: 'stunden-pro-monat',
            typ: 'line',
            titel: 'Arbeitsstunden pro Monat',
            daten: zeiterfassungProMonat.map(item => ({
              monat: item._id,
              stunden: item.stunden
            }))
          },
          {
            id: 'stunden-pro-projekt',
            typ: 'bar',
            titel: 'Stunden pro Projekt',
            daten: zeiterfassungProProjekt.map(item => ({
              projekt: item.projektName || 'Unbekannt',
              stunden: item.stunden
            }))
          }
        ],
        tables: [
          {
            id: 'einsatz-timeline',
            titel: 'Einsatz-Timeline',
            daten: einsatzTimeline
          },
          {
            id: 'urlaub',
            titel: 'Urlaubsübersicht',
            daten: urlaubsUebersicht
          },
          {
            id: 'projekte',
            titel: 'Projekte',
            daten: projekteListe.map(p => ({
              projektId: p._id,
              projektName: p.projektName,
              anzahlEinsaetze: p.anzahlEinsaetze,
              ersteEinsatz: p.ersteEinsatz,
              letzteEinsatz: p.letzteEinsatz
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
    console.error('[GET /api/statistiken/mitarbeiter/[id]] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Mitarbeiter-Detail-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
