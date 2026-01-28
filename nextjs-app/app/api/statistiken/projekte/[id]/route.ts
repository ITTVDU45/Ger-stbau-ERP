/**
 * GET /api/statistiken/projekte/[id]
 * 
 * API für detaillierte Statistiken eines einzelnen Projekts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfYear, endOfYear } from 'date-fns'
import { Projekt, Zeiterfassung, Transaktion, Rechnung, Einsatz } from '@/lib/db/types'
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
        { erfolg: false, fehler: 'Ungültige Projekt-ID' },
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
    
    // Projekt laden
    const projekt = await db.collection<Projekt>('projekte')
      .findOne({ _id: new ObjectId(id) })
    
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Parallele Abfragen
    const [
      zeiterfassungProMonat,
      transaktionen,
      rechnungen,
      mitarbeiterListe
    ] = await Promise.all([
      // 1. Stunden pro Monat
      db.collection<Zeiterfassung>('zeiterfassung').aggregate([
        {
          $match: {
            projektId: id,
            datum: { $gte: von, $lte: bis },
            status: { $ne: 'abgelehnt' }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$datum' } },
            stunden: { $sum: '$stunden' }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray(),
      
      // 2. Alle Transaktionen (Ausgaben)
      db.collection<Transaktion>('transaktionen')
        .find({
          projektId: id,
          typ: 'ausgabe',
          datum: { $gte: von, $lte: bis },
          status: { $ne: 'storniert' }
        })
        .sort({ datum: -1 })
        .toArray(),
      
      // 3. Alle Rechnungen
      db.collection<Rechnung>('rechnungen')
        .find({ projektId: id })
        .sort({ rechnungsdatum: -1 })
        .toArray(),
      
      // 4. Mitarbeiter-Liste
      db.collection<Einsatz>('einsatz')
        .find({
          projektId: id,
          von: { $lte: bis },
          bis: { $gte: von }
        })
        .toArray()
    ])
    
    // Geplante Stunden
    const geplanteStunden = projekt.zugewieseneMitarbeiter?.reduce((sum, m) => {
      return sum + (m.stundenAufbau || 0) + (m.stundenAbbau || 0)
    }, 0) || 0
    
    // Tatsächliche Stunden
    const tatsaechlicheStunden = zeiterfassungProMonat.reduce((sum, item) => sum + item.stunden, 0)
    
    // Ausgaben nach Kategorie
    const ausgabenKategorien = transaktionen.reduce((acc, t) => {
      const kategorie = t.kategorieName || 'Sonstiges'
      acc[kategorie] = (acc[kategorie] || 0) + t.betrag
      return acc
    }, {} as Record<string, number>)
    
    const ausgaben = {
      personal: Object.entries(ausgabenKategorien)
        .filter(([k]) => k.toLowerCase().includes('personal'))
        .reduce((sum, [, v]) => sum + v, 0),
      material: Object.entries(ausgabenKategorien)
        .filter(([k]) => k.toLowerCase().includes('material'))
        .reduce((sum, [, v]) => sum + v, 0),
      sonstiges: Object.entries(ausgabenKategorien)
        .filter(([k]) => !k.toLowerCase().includes('personal') && !k.toLowerCase().includes('material'))
        .reduce((sum, [, v]) => sum + v, 0)
    }
    const gesamtAusgaben = Object.values(ausgaben).reduce((sum, w) => sum + w, 0)
    
    // Einnahmen (aus bezahlten Rechnungen)
    const einnahmen = rechnungen
      .filter(r => r.status === 'bezahlt')
      .reduce((sum, r) => sum + r.brutto, 0)
    
    // Budget vs. Ist
    const budget = projekt.budget || projekt.angebotssumme || 0
    const istKosten = projekt.istKosten || gesamtAusgaben
    const budgetabweichung = budget > 0 ? ((istKosten - budget) / budget) * 100 : 0
    
    // Gewinnmarge
    const gewinn = einnahmen - istKosten
    const gewinnmarge = einnahmen > 0 ? (gewinn / einnahmen) * 100 : 0
    
    // Projektlaufzeit
    let laufzeitGeplant = 0
    let laufzeitTatsaechlich = 0
    
    if (projekt.startdatum && projekt.geplantesEnddatum) {
      const start = new Date(projekt.startdatum)
      const end = new Date(projekt.geplantesEnddatum)
      laufzeitGeplant = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    }
    
    if (projekt.startdatum && projekt.enddatum) {
      const start = new Date(projekt.startdatum)
      const end = new Date(projekt.enddatum)
      laufzeitTatsaechlich = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    }
    
    // Mitarbeiter-Zuordnungen
    const mitarbeiterZuordnungen = mitarbeiterListe.reduce((acc, e) => {
      const maId = e.mitarbeiterId
      if (!acc[maId]) {
        acc[maId] = {
          mitarbeiterId: maId,
          mitarbeiterName: e.mitarbeiterName,
          anzahlEinsaetze: 0,
          stunden: 0
        }
      }
      acc[maId].anzahlEinsaetze++
      return acc
    }, {} as Record<string, { mitarbeiterId: string; mitarbeiterName: string; anzahlEinsaetze: number; stunden: number }>)
    
    // Stunden pro Mitarbeiter berechnen
    const mitarbeiterMitStunden = await Promise.all(
      Object.values(mitarbeiterZuordnungen).map(async (ma) => {
        const stunden = await db.collection<Zeiterfassung>('zeiterfassung')
          .aggregate([
            {
              $match: {
                projektId: id,
                mitarbeiterId: ma.mitarbeiterId,
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
          ])
          .toArray()
        
        return {
          ...ma,
          stunden: stunden[0]?.stunden || 0
        }
      })
    )
    
    // Kostenaufschlüsselung
    const kostenaufschlusselung = [
      { kategorie: 'Personal', betrag: ausgaben.personal },
      { kategorie: 'Material', betrag: ausgaben.material },
      { kategorie: 'Sonstiges', betrag: ausgaben.sonstiges }
    ]
    
    return NextResponse.json({
      erfolg: true,
      data: {
        projekt: {
          id: projekt._id?.toString(),
          projektname: projekt.projektname,
          projektnummer: projekt.projektnummer,
          status: projekt.status,
          kundeName: projekt.kundeName
        },
        overview: [
          {
            id: 'budget-vs-ist',
            titel: 'Budget vs. Ist',
            wert: `${istKosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / ${budget.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`,
            format: 'text',
            untertitel: `${budgetabweichung > 0 ? '+' : ''}${budgetabweichung.toFixed(1)}% Abweichung`
          },
          {
            id: 'stunden',
            titel: 'Stunden',
            wert: `${tatsaechlicheStunden.toFixed(1)} / ${geplanteStunden.toFixed(1)}`,
            format: 'text',
            untertitel: geplanteStunden > 0 
              ? `${(((tatsaechlicheStunden - geplanteStunden) / geplanteStunden) * 100).toFixed(1)}% Abweichung`
              : 'Keine Planung'
          },
          {
            id: 'mitarbeiter',
            titel: 'Mitarbeiter',
            wert: mitarbeiterMitStunden.length,
            format: 'number',
            untertitel: `${mitarbeiterMitStunden.filter(m => m.stunden > 0).length} aktiv`
          },
          {
            id: 'gewinn',
            titel: 'Gewinn',
            wert: gewinn,
            format: 'currency',
            untertitel: `${gewinnmarge.toFixed(1)}% Marge`
          },
          {
            id: 'rechnungen',
            titel: 'Rechnungen',
            wert: rechnungen.length,
            format: 'number',
            untertitel: `${rechnungen.filter(r => r.status === 'bezahlt').length} bezahlt`
          }
        ],
        charts: [
          {
            id: 'stunden-pro-monat',
            typ: 'line',
            titel: 'Stunden pro Monat',
            daten: zeiterfassungProMonat.map(item => ({
              monat: item._id,
              stunden: item.stunden
            }))
          },
          {
            id: 'budget-vs-ist',
            typ: 'bar',
            titel: 'Budget vs. Ist',
            daten: [
              { name: 'Budget', wert: budget },
              { name: 'Ist', wert: istKosten }
            ]
          },
          {
            id: 'kostenaufschlusselung',
            typ: 'pie',
            titel: 'Kostenaufschlüsselung',
            daten: kostenaufschlusselung.map(k => ({
              name: k.kategorie,
              wert: k.betrag
            }))
          }
        ],
        tables: [
          {
            id: 'mitarbeiter-zuordnungen',
            titel: 'Mitarbeiter-Zuordnungen',
            daten: mitarbeiterMitStunden.map(m => ({
              mitarbeiterId: m.mitarbeiterId,
              mitarbeiterName: m.mitarbeiterName,
              anzahlEinsaetze: m.anzahlEinsaetze,
              stunden: m.stunden
            }))
          },
          {
            id: 'kostenaufschlusselung',
            titel: 'Kostenaufschlüsselung',
            daten: kostenaufschlusselung
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
    console.error('[GET /api/statistiken/projekte/[id]] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Projekt-Detail-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
