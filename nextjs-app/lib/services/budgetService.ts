import { getDatabase } from '@/lib/db/client'
import { Budget, Transaktion } from '@/lib/db/types'
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'

export class BudgetService {
  
  /**
   * Prüft alle Budgets auf Überschreitung und gibt Warnungen zurück
   */
  static async pruefeAlleBudgets(mandantId?: string) {
    const db = await getDatabase()
    const budgetsCollection = db.collection<Budget>('budgets')
    
    const filter: any = { aktiv: true }
    if (mandantId) filter.mandantId = mandantId
    
    const budgets = await budgetsCollection.find(filter).toArray()
    
    const warnungen: any[] = []
    const heute = new Date()
    
    for (const budget of budgets) {
      // Bestimme Zeitraum
      let vonDatum: Date
      let bisDatum: Date
      
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
      
      // Berechne Ausgaben
      const ausgabenFilter: any = {
        kategorieId: budget.kategorieId,
        typ: 'ausgabe',
        status: { $ne: 'storniert' },
        datum: { $gte: vonDatum, $lte: bisDatum }
      }
      if (mandantId) ausgabenFilter.mandantId = mandantId
      
      const ausgaben = await db.collection<Transaktion>('transaktionen')
        .aggregate([
          { $match: ausgabenFilter },
          {
            $group: {
              _id: null,
              gesamt: { $sum: '$betrag' }
            }
          }
        ])
        .toArray()
      
      const ausgabenGesamt = ausgaben[0]?.gesamt || 0
      const prozentAusgelastet = (ausgabenGesamt / budget.betrag) * 100
      
      if (prozentAusgelastet >= budget.warnungBeiProzent) {
        warnungen.push({
          budgetId: budget._id,
          kategorieName: budget.kategorieName,
          budgetBetrag: budget.betrag,
          ausgabenAktuell: ausgabenGesamt,
          prozentAusgelastet: Math.round(prozentAusgelastet * 100) / 100,
          ueberschritten: prozentAusgelastet > 100,
          zeitraum: budget.zeitraum,
          warnstufe: prozentAusgelastet > 100 ? 'kritisch' : 'warnung'
        })
      }
    }
    
    return warnungen
  }
  
  /**
   * Gibt Empfehlungen für Budget-Anpassungen
   */
  static async empfehleBudgetAnpassungen(mandantId?: string) {
    const db = await getDatabase()
    
    // Analysiere die letzten 3 Monate
    const heute = new Date()
    const vor3Monaten = new Date()
    vor3Monaten.setMonth(vor3Monaten.getMonth() - 3)
    
    const filter: any = {
      datum: { $gte: vor3Monaten, $lte: heute },
      typ: 'ausgabe',
      status: { $ne: 'storniert' }
    }
    if (mandantId) filter.mandantId = mandantId
    
    // Durchschnittliche Ausgaben pro Kategorie
    const durchschnitt = await db.collection<Transaktion>('transaktionen')
      .aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              kategorieId: '$kategorieId',
              kategorieName: '$kategorieName'
            },
            durchschnittProMonat: { $avg: '$betrag' },
            gesamt: { $sum: '$betrag' },
            anzahl: { $sum: 1 }
          }
        },
        { $sort: { gesamt: -1 } }
      ])
      .toArray()
    
    const empfehlungen: any[] = []
    
    for (const kategorie of durchschnitt) {
      const empfohlenesBudget = Math.ceil(kategorie.durchschnittProMonat * 1.2) // 20% Puffer
      
      empfehlungen.push({
        kategorieId: kategorie._id.kategorieId,
        kategorieName: kategorie._id.kategorieName,
        durchschnittProMonat: Math.round(kategorie.durchschnittProMonat * 100) / 100,
        empfohlenesBudgetMonat: empfohlenesBudget,
        empfohlenesBudgetQuartal: empfohlenesBudget * 3,
        empfohlenesBudgetJahr: empfohlenesBudget * 12
      })
    }
    
    return empfehlungen
  }
}

