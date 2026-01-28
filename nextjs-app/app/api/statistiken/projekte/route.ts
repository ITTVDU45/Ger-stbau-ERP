/**
 * GET /api/statistiken/projekte
 * 
 * API für Projekt-Statistiken (Übersicht alle Projekte)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { startOfYear, endOfYear } from 'date-fns'
import { Projekt, Zeiterfassung, Transaktion, Rechnung, Einsatz } from '@/lib/db/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vonParam = searchParams.get('von')
    const bisParam = searchParams.get('bis')
    const projektId = searchParams.get('projektId')
    const statusFilter = searchParams.get('status')
    
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
    
    // Filter für Projekte
    const projektFilter: any = {}
    if (projektId) {
      projektFilter._id = projektId
    }
    if (statusFilter) {
      projektFilter.status = statusFilter
    }
    
    // Alle Projekte laden
    const projekte = await db.collection<Projekt>('projekte')
      .find(projektFilter)
      .toArray()
    
    // Für jedes Projekt Statistiken berechnen
    const projektStats = await Promise.all(
      projekte.map(async (projekt) => {
        const projektIdStr = projekt._id?.toString() || ''
        
        // Parallele Abfragen
        const [
          zeiterfassungStats,
          transaktionStats,
          rechnungStats,
          mitarbeiterStats
        ] = await Promise.all([
          // 1. Geplante vs. tatsächliche Stunden
          db.collection<Zeiterfassung>('zeiterfassung').aggregate([
            {
              $match: {
                projektId: projektIdStr,
                datum: { $gte: von, $lte: bis },
                status: { $ne: 'abgelehnt' }
              }
            },
            {
              $group: {
                _id: null,
                tatsaechlicheStunden: { $sum: '$stunden' },
                anzahlEintraege: { $sum: 1 }
              }
            }
          ]).toArray(),
          
          // 2. Ausgaben (Transaktionen)
          db.collection<Transaktion>('transaktionen').aggregate([
            {
              $match: {
                projektId: projektIdStr,
                typ: 'ausgabe',
                datum: { $gte: von, $lte: bis },
                status: { $ne: 'storniert' }
              }
            },
            {
              $group: {
                _id: '$kategorieName',
                summe: { $sum: '$betrag' }
              }
            }
          ]).toArray(),
          
          // 3. Rechnungen
          db.collection<Rechnung>('rechnungen').aggregate([
            {
              $match: {
                projektId: projektIdStr
              }
            },
            {
              $group: {
                _id: '$status',
                anzahl: { $sum: 1 },
                summe: { $sum: '$brutto' }
              }
            }
          ]).toArray(),
          
          // 4. Mitarbeiter
          db.collection<Einsatz>('einsatz').aggregate([
            {
              $match: {
                projektId: projektIdStr,
                von: { $lte: bis },
                bis: { $gte: von }
              }
            },
            {
              $group: {
                _id: '$mitarbeiterId',
                mitarbeiterName: { $first: '$mitarbeiterName' },
                anzahlEinsaetze: { $sum: 1 }
              }
            }
          ]).toArray()
        ])
        
        const zeiterfassung = zeiterfassungStats[0] || { tatsaechlicheStunden: 0, anzahlEintraege: 0 }
        const geplanteStunden = projekt.zugewieseneMitarbeiter?.reduce((sum, m) => {
          return sum + (m.stundenAufbau || 0) + (m.stundenAbbau || 0)
        }, 0) || 0
        
        // Ausgaben nach Kategorie
        const ausgaben = {
          personal: transaktionStats.find(t => t._id?.toLowerCase().includes('personal'))?.summe || 0,
          material: transaktionStats.find(t => t._id?.toLowerCase().includes('material'))?.summe || 0,
          sonstiges: transaktionStats.reduce((sum, t) => {
            const kategorie = t._id?.toLowerCase() || ''
            if (!kategorie.includes('personal') && !kategorie.includes('material')) {
              return sum + t.summe
            }
            return sum
          }, 0)
        }
        const gesamtAusgaben = Object.values(ausgaben).reduce((sum, w) => sum + w, 0)
        
        // Rechnungen aggregieren
        const rechnungen = {
          gestellt: rechnungStats.reduce((sum, r) => sum + r.anzahl, 0),
          bezahlt: rechnungStats.find(r => r._id === 'bezahlt')?.anzahl || 0,
          offen: rechnungStats.filter(r => ['gesendet', 'ueberfaellig', 'teilbezahlt'].includes(r._id)).reduce((sum, r) => sum + r.anzahl, 0),
          gesamtSumme: rechnungStats.reduce((sum, r) => sum + r.summe, 0)
        }
        
        // Einnahmen (aus bezahlten Rechnungen)
        const einnahmen = rechnungStats
          .filter(r => r._id === 'bezahlt')
          .reduce((sum, r) => sum + r.summe, 0)
        
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
        
        // Mitarbeiter
        const mitarbeiter = {
          zugewiesen: mitarbeiterStats.length,
          aktiv: mitarbeiterStats.length // Vereinfacht: alle im Zeitraum als aktiv
        }
        
        // Aufbau-/Abbau-Tage
        const aufbauTage = projekt.zugewieseneMitarbeiter?.filter(m => m.setupDate || m.aufbauVon).length || 0
        const abbauTage = projekt.zugewieseneMitarbeiter?.filter(m => m.dismantleDate || m.abbauVon).length || 0
        
        return {
          projektId: projektIdStr,
          projektname: projekt.projektname,
          projektnummer: projekt.projektnummer,
          status: projekt.status,
          budget: {
            geplant: budget,
            ist: istKosten,
            abweichung: budgetabweichung
          },
          stunden: {
            geplant: geplanteStunden,
            tatsaechlich: zeiterfassung.tatsaechlicheStunden,
            abweichung: geplanteStunden > 0 
              ? ((zeiterfassung.tatsaechlicheStunden - geplanteStunden) / geplanteStunden) * 100 
              : 0
          },
          mitarbeiter: {
            zugewiesen: mitarbeiter.zugewiesen,
            aktiv: mitarbeiter.aktiv
          },
          laufzeit: {
            geplant: laufzeitGeplant,
            tatsaechlich: laufzeitTatsaechlich,
            abweichung: laufzeitGeplant > 0
              ? ((laufzeitTatsaechlich - laufzeitGeplant) / laufzeitGeplant) * 100
              : 0
          },
          einnahmen: {
            geplant: budget,
            tatsaechlich: einnahmen
          },
          ausgaben: {
            personal: ausgaben.personal,
            material: ausgaben.material,
            sonstiges: ausgaben.sonstiges,
            gesamt: gesamtAusgaben
          },
          gewinn: {
            betrag: gewinn,
            marge: gewinnmarge
          },
          rechnungen: {
            gestellt: rechnungen.gestellt,
            bezahlt: rechnungen.bezahlt,
            offen: rechnungen.offen,
            gesamtSumme: rechnungen.gesamtSumme
          },
          aufbauAbbau: {
            aufbauTage,
            abbauTage
          }
        }
      })
    )
    
    // Aggregierte Charts-Daten
    const projektstatusChart = projektStats.reduce((acc, stat) => {
      acc[stat.status] = (acc[stat.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const budgetVsIstChart = projektStats
      .filter(s => s.budget.geplant > 0)
      .slice(0, 10)
      .map(stat => ({
        projekt: stat.projektname,
        budget: stat.budget.geplant,
        ist: stat.budget.ist
      }))
    
    // Top-Projekte nach Gewinn
    const topProjekte = [...projektStats]
      .sort((a, b) => b.gewinn.betrag - a.gewinn.betrag)
      .slice(0, 10)
      .map(stat => ({
        projektId: stat.projektId,
        projektname: stat.projektname,
        gewinn: stat.gewinn.betrag,
        marge: stat.gewinn.marge,
        umsatz: stat.einnahmen.tatsaechlich
      }))
    
    // KPIs
    const overview = [
      {
        id: 'aktive-projekte',
        titel: 'Aktive Projekte',
        wert: projektStats.filter(s => s.status === 'aktiv').length,
        format: 'number'
      },
      {
        id: 'durchschnitt-budgetabweichung',
        titel: 'Ø Budgetabweichung',
        wert: projektStats.filter(s => s.budget.geplant > 0).length > 0
          ? projektStats
              .filter(s => s.budget.geplant > 0)
              .reduce((sum, s) => sum + s.budget.abweichung, 0) / projektStats.filter(s => s.budget.geplant > 0).length
          : 0,
        format: 'percent'
      },
      {
        id: 'gesamt-gewinn',
        titel: 'Gesamtgewinn',
        wert: projektStats.reduce((sum, s) => sum + s.gewinn.betrag, 0),
        format: 'currency'
      }
    ]
    
    return NextResponse.json({
      erfolg: true,
      data: {
        overview,
        projekte: projektStats,
        charts: [
          {
            id: 'projektstatus',
            typ: 'pie',
            titel: 'Projektstatus-Verteilung',
            daten: Object.entries(projektstatusChart).map(([status, anzahl]) => ({
              name: status,
              wert: anzahl
            }))
          },
          {
            id: 'budget-vs-ist',
            typ: 'bar',
            titel: 'Budget vs. Ist (Top 10)',
            daten: budgetVsIstChart
          }
        ],
        tables: [
          {
            id: 'top-projekte',
            titel: 'Top Projekte nach Gewinn',
            daten: topProjekte
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
    console.error('[GET /api/statistiken/projekte] Fehler:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Projekt-Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
