import { getDatabase } from '@/lib/db/client'
import { Transaktion, LiquiditaetsEinstellungen } from '@/lib/db/types'

export class LiquiditaetService {
  
  /**
   * Prüft Liquidität gegen Schwellwerte und gibt Warnung zurück
   */
  static async pruefeLiquiditaet(mandantId?: string) {
    const db = await getDatabase()
    
    // Lade Liquiditäts-Einstellungen
    const einstellungenCollection = db.collection<LiquiditaetsEinstellungen>('liquiditaets_einstellungen')
    const filter: any = { aktiv: true }
    if (mandantId) filter.mandantId = mandantId
    
    const einstellungen = await einstellungenCollection.findOne(filter)
    
    if (!einstellungen) {
      // Standard-Schwellwerte wenn keine Einstellungen vorhanden
      return {
        pruefungDurchgefuehrt: false,
        hinweis: 'Keine Liquiditäts-Einstellungen konfiguriert'
      }
    }
    
    // Berechne aktuellen Saldo
    const heute = new Date()
    const transaktionenFilter: any = {
      datum: { $lte: heute },
      status: { $ne: 'storniert' }
    }
    if (mandantId) transaktionenFilter.mandantId = mandantId
    
    const transaktionen = await db.collection<Transaktion>('transaktionen')
      .find(transaktionenFilter)
      .toArray()
    
    const einnahmen = transaktionen.filter(t => t.typ === 'einnahme').reduce((sum, t) => sum + t.betrag, 0)
    const ausgaben = transaktionen.filter(t => t.typ === 'ausgabe').reduce((sum, t) => sum + t.betrag, 0)
    const aktuellerSaldo = einnahmen - ausgaben
    
    // Prognose für eingestellten Zeitraum
    const vor30Tagen = new Date()
    vor30Tagen.setDate(vor30Tagen.getDate() - 30)
    
    const letzte30Tage = transaktionen.filter(t => t.datum >= vor30Tagen)
    const einnahmenProTag = letzte30Tage.filter(t => t.typ === 'einnahme').reduce((sum, t) => sum + t.betrag, 0) / 30
    const ausgabenProTag = letzte30Tage.filter(t => t.typ === 'ausgabe').reduce((sum, t) => sum + t.betrag, 0) / 30
    
    const prognoseSaldo = aktuellerSaldo + (einnahmenProTag - ausgabenProTag) * einstellungen.prognoseZeitraum
    
    // Warnstufen
    let warnstufe: 'ok' | 'niedrig' | 'kritisch' = 'ok'
    let nachricht = ''
    
    if (aktuellerSaldo < einstellungen.kritischerSaldo) {
      warnstufe = 'kritisch'
      nachricht = `Kritische Liquidität! Aktueller Saldo (${aktuellerSaldo.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) ist unter kritischem Schwellwert (${einstellungen.kritischerSaldo.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}).`
    } else if (aktuellerSaldo < einstellungen.minimalerSaldo) {
      warnstufe = 'niedrig'
      nachricht = `Niedrige Liquidität. Aktueller Saldo (${aktuellerSaldo.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) ist unter minimalem Schwellwert (${einstellungen.minimalerSaldo.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}).`
    } else if (prognoseSaldo < einstellungen.minimalerSaldo) {
      warnstufe = 'niedrig'
      nachricht = `Prognose-Warnung: Saldo wird in ${einstellungen.prognoseZeitraum} Tagen voraussichtlich unter Mindestschwellwert fallen (Prognose: ${prognoseSaldo.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}).`
    }
    
    return {
      pruefungDurchgefuehrt: true,
      warnstufe,
      nachricht,
      aktuellerSaldo,
      prognoseSaldo,
      prognoseZeitraum: einstellungen.prognoseZeitraum,
      minimalerSaldo: einstellungen.minimalerSaldo,
      kritischerSaldo: einstellungen.kritischerSaldo,
      durchschnittEinnahmenProTag: einnahmenProTag,
      durchschnittAusgabenProTag: ausgabenProTag
    }
  }
  
  /**
   * Erstellt Liquiditäts-Forecast für die nächsten X Tage
   */
  static async erstelleForecast(tage: number, mandantId?: string) {
    const db = await getDatabase()
    
    // Berechne durchschnittliche Cashflows
    const heute = new Date()
    const vor90Tagen = new Date()
    vor90Tagen.setDate(vor90Tagen.getDate() - 90)
    
    const filter: any = {
      datum: { $gte: vor90Tagen, $lte: heute },
      status: { $ne: 'storniert' }
    }
    if (mandantId) filter.mandantId = mandantId
    
    const transaktionen = await db.collection<Transaktion>('transaktionen')
      .find(filter)
      .toArray()
    
    const einnahmenProTag = transaktionen
      .filter(t => t.typ === 'einnahme')
      .reduce((sum, t) => sum + t.betrag, 0) / 90
    
    const ausgabenProTag = transaktionen
      .filter(t => t.typ === 'ausgabe')
      .reduce((sum, t) => sum + t.betrag, 0) / 90
    
    // Berechne aktuellen Saldo
    const alleFilter: any = {
      datum: { $lte: heute },
      status: { $ne: 'storniert' }
    }
    if (mandantId) alleFilter.mandantId = mandantId
    
    const alleTransaktionen = await db.collection<Transaktion>('transaktionen')
      .find(alleFilter)
      .toArray()
    
    const aktuellerSaldo = alleTransaktionen
      .filter(t => t.typ === 'einnahme')
      .reduce((sum, t) => sum + t.betrag, 0) -
      alleTransaktionen
      .filter(t => t.typ === 'ausgabe')
      .reduce((sum, t) => sum + t.betrag, 0)
    
    // Erstelle Forecast
    const forecast: any[] = []
    let saldo = aktuellerSaldo
    
    for (let i = 0; i <= tage; i++) {
      const datum = new Date(heute)
      datum.setDate(datum.getDate() + i)
      
      if (i > 0) {
        saldo += einnahmenProTag - ausgabenProTag
      }
      
      forecast.push({
        tag: i,
        datum: datum.toISOString().split('T')[0],
        prognostizierterSaldo: Math.round(saldo * 100) / 100,
        erwarteteEinnahmen: Math.round(einnahmenProTag * 100) / 100,
        erwarteteAusgaben: Math.round(ausgabenProTag * 100) / 100
      })
    }
    
    return {
      aktuellerSaldo,
      durchschnittEinnahmenProTag: einnahmenProTag,
      durchschnittAusgabenProTag: ausgabenProTag,
      forecast
    }
  }
}

