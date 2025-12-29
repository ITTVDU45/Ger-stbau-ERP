import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Budget, Transaktion } from '@/lib/db/types'
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mandantId = searchParams.get('mandantId')
    const von = searchParams.get('von')
    const bis = searchParams.get('bis')
    
    const db = await getDatabase()
    const budgetsCollection = db.collection<Budget>('budgets')
    const transaktionenCollection = db.collection<Transaktion>('transaktionen')
    
    // Lade alle aktiven Budgets
    const filter: any = { aktiv: true }
    if (mandantId) filter.mandantId = mandantId
    
    const budgets = await budgetsCollection.find(filter).toArray()
    
    // Berechne Auslastung für jedes Budget
    const heute = new Date()
    const budgetStatus = []
    
    for (const budget of budgets) {
      // Bestimme Zeitraum - entweder aus Filter oder basierend auf Budget-Zeitraum
      let vonDatum: Date
      let bisDatum: Date
      
      if (von && bis) {
        // Verwende Zeitraumfilter aus UI
        vonDatum = new Date(von)
        bisDatum = new Date(bis)
      } else {
        // Fallback: Verwende Budget-Zeitraum
        switch (budget.zeitraum) {
          case 'monat':
            vonDatum = startOfMonth(heute)
            bisDatum = endOfMonth(heute)
            break
          case 'quartal':
            vonDatum = startOfQuarter(heute)
            bisDatum = endOfQuarter(heute)
            break
          case 'jahr':
            vonDatum = startOfYear(heute)
            bisDatum = endOfYear(heute)
            break
          default:
            vonDatum = startOfMonth(heute)
            bisDatum = endOfMonth(heute)
        }
      }
      
      // Berechne Ausgaben im Zeitraum für diese Kategorie
      const ausgabenFilter: any = {
        kategorieId: budget.kategorieId,
        typ: 'ausgabe',
        status: { $ne: 'storniert' },
        datum: { $gte: vonDatum, $lte: bisDatum }
      }
      if (mandantId) ausgabenFilter.mandantId = mandantId
      
      const ausgaben = await transaktionenCollection.aggregate([
        { $match: ausgabenFilter },
        {
          $group: {
            _id: null,
            gesamt: { $sum: '$betrag' }
          }
        }
      ]).toArray()
      
      const ausgabenAktuell = ausgaben[0]?.gesamt || 0
      const prozentAusgelastet = (ausgabenAktuell / budget.betrag) * 100
      const ueberschritten = prozentAusgelastet > 100
      const warnungAktiv = prozentAusgelastet >= budget.warnungBeiProzent
      
      budgetStatus.push({
        budgetId: budget._id,
        kategorieId: budget.kategorieId,
        kategorieName: budget.kategorieName,
        budgetBetrag: budget.betrag,
        ausgabenAktuell,
        prozentAusgelastet: Math.round(prozentAusgelastet * 100) / 100,
        ueberschritten,
        warnungAktiv,
        zeitraum: budget.zeitraum,
        vonDatum,
        bisDatum
      })
    }
    
    return NextResponse.json({ erfolg: true, budgets: budgetStatus })
  } catch (error) {
    console.error('Fehler beim Laden des Budget-Status:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden des Budget-Status' },
      { status: 500 }
    )
  }
}

