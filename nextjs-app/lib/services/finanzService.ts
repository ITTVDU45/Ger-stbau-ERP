import { getDatabase } from '@/lib/db/client'
import { Transaktion, Budget } from '@/lib/db/types'

export class FinanzService {
  
  /**
   * Berechnet Budget-Auslastung für eine Kategorie
   */
  static async berechneBudgetAuslastung(
    kategorieId: string,
    zeitraum: { von: Date; bis: Date },
    mandantId?: string
  ) {
    const db = await getDatabase()
    
    // Hole Budget
    const budget = await db.collection<Budget>('budgets').findOne({
      kategorieId,
      mandantId,
      aktiv: true,
      gueltigVon: { $lte: zeitraum.von },
      $or: [
        { gueltigBis: { $gte: zeitraum.bis } },
        { gueltigBis: { $exists: false } }
      ]
    })
    
    if (!budget) return null
    
    // Summe Ausgaben in Zeitraum
    const ausgaben = await db.collection<Transaktion>('transaktionen')
      .aggregate([
        {
          $match: {
            kategorieId,
            mandantId,
            typ: 'ausgabe',
            status: { $ne: 'storniert' },
            datum: { $gte: zeitraum.von, $lte: zeitraum.bis }
          }
        },
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
    
    return {
      budget,
      ausgabenGesamt,
      prozentAusgelastet,
      ueberschritten: prozentAusgelastet > 100,
      warnungAktiv: prozentAusgelastet >= budget.warnungBeiProzent
    }
  }
  
  /**
   * Prognose: Liquidität in X Tagen
   */
  static async prognostiziereLiquiditaet(
    tageInZukunft: number,
    mandantId?: string
  ) {
    const db = await getDatabase()
    
    // Aktueller Saldo
    const heute = new Date()
    const filter: any = {
      datum: { $lte: heute },
      status: { $ne: 'storniert' }
    }
    if (mandantId) filter.mandantId = mandantId
    
    const transaktionen = await db.collection<Transaktion>('transaktionen')
      .find(filter)
      .toArray()
    
    const einnahmen = transaktionen.filter(t => t.typ === 'einnahme').reduce((sum, t) => sum + t.betrag, 0)
    const ausgaben = transaktionen.filter(t => t.typ === 'ausgabe').reduce((sum, t) => sum + t.betrag, 0)
    const aktuellerSaldo = einnahmen - ausgaben
    
    // Durchschnittliche Einnahmen/Ausgaben pro Tag (letzte 30 Tage)
    const vor30Tagen = new Date()
    vor30Tagen.setDate(vor30Tagen.getDate() - 30)
    
    const letzte30Tage = transaktionen.filter(t => t.datum >= vor30Tagen)
    const einnahmenProTag = letzte30Tage.filter(t => t.typ === 'einnahme').reduce((sum, t) => sum + t.betrag, 0) / 30
    const ausgabenProTag = letzte30Tage.filter(t => t.typ === 'ausgabe').reduce((sum, t) => sum + t.betrag, 0) / 30
    
    // Einfache Prognose
    const prognoseSaldo = aktuellerSaldo + (einnahmenProTag - ausgabenProTag) * tageInZukunft
    
    return {
      aktuellerSaldo,
      prognoseSaldo,
      tageInZukunft,
      einnahmenProTag,
      ausgabenProTag,
      trend: prognoseSaldo > aktuellerSaldo ? 'positiv' : 'negativ'
    }
  }
  
  /**
   * Berechnet MwSt-Summen nach Steuersatz
   */
  static async berechneMwStSummen(
    zeitraum: { von: Date; bis: Date },
    mandantId?: string
  ) {
    const db = await getDatabase()
    
    const filter: any = {
      datum: { $gte: zeitraum.von, $lte: zeitraum.bis },
      status: { $ne: 'storniert' }
    }
    if (mandantId) filter.mandantId = mandantId
    
    const mwstSummen = await db.collection<Transaktion>('transaktionen')
      .aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              mwstSatz: '$mwstSatz',
              typ: '$typ'
            },
            summeNetto: { $sum: { $ifNull: ['$nettobetrag', '$betrag'] } },
            summeMwSt: { $sum: { $ifNull: ['$mwstBetrag', 0] } },
            summeBrutto: { $sum: '$betrag' },
            anzahl: { $sum: 1 }
          }
        },
        { $sort: { '_id.mwstSatz': -1 } }
      ])
      .toArray()
    
    // Gruppiere nach Steuersatz
    const gruppiert = new Map<number, any>()
    
    mwstSummen.forEach(item => {
      const satz = item._id.mwstSatz || 0
      const typ = item._id.typ
      
      if (!gruppiert.has(satz)) {
        gruppiert.set(satz, {
          mwstSatz: satz,
          einnahmen: { netto: 0, mwst: 0, brutto: 0, anzahl: 0 },
          ausgaben: { netto: 0, mwst: 0, brutto: 0, anzahl: 0 },
          gesamt: { netto: 0, mwst: 0, brutto: 0 }
        })
      }
      
      const entry = gruppiert.get(satz)!
      
      if (typ === 'einnahme') {
        entry.einnahmen.netto += item.summeNetto
        entry.einnahmen.mwst += item.summeMwSt
        entry.einnahmen.brutto += item.summeBrutto
        entry.einnahmen.anzahl += item.anzahl
      } else {
        entry.ausgaben.netto += item.summeNetto
        entry.ausgaben.mwst += item.summeMwSt
        entry.ausgaben.brutto += item.summeBrutto
        entry.ausgaben.anzahl += item.anzahl
      }
      
      entry.gesamt.netto = entry.einnahmen.netto - entry.ausgaben.netto
      entry.gesamt.mwst = entry.einnahmen.mwst - entry.ausgaben.mwst
      entry.gesamt.brutto = entry.einnahmen.brutto - entry.ausgaben.brutto
    })
    
    return Array.from(gruppiert.values())
  }
}

