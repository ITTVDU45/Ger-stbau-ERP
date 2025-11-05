import { AngebotPosition } from '@/lib/db/types'

/**
 * Kalkulationsengine für Angebote und Rechnungen
 */
export class KalkulationsEngine {
  /**
   * Berechnet die Gesamtsumme einer Position
   */
  static berechnePosition(menge: number, einzelpreis: number): number {
    return menge * einzelpreis
  }

  /**
   * Berechnet die Zwischensumme aller Positionen
   */
  static berechneZwischensumme(positionen: AngebotPosition[]): number {
    return positionen.reduce((sum, pos) => sum + pos.gesamtpreis, 0)
  }

  /**
   * Berechnet den Rabattbetrag
   */
  static berechneRabatt(zwischensumme: number, rabattProzent: number): number {
    return zwischensumme * (rabattProzent / 100)
  }

  /**
   * Berechnet den Nettobetrag
   */
  static berechneNetto(zwischensumme: number, rabatt: number): number {
    return zwischensumme - rabatt
  }

  /**
   * Berechnet die Mehrwertsteuer
   */
  static berechneMwSt(netto: number, mwstSatz: number): number {
    return netto * (mwstSatz / 100)
  }

  /**
   * Berechnet den Bruttobetrag
   */
  static berechneBrutto(netto: number, mwstBetrag: number): number {
    return netto + mwstBetrag
  }

  /**
   * Vollständige Kalkulation für Angebot/Rechnung
   */
  static berechneGesamt(
    positionen: AngebotPosition[],
    rabattProzent: number = 0,
    mwstSatz: number = 19
  ): {
    zwischensumme: number
    rabatt: number
    netto: number
    mwstBetrag: number
    brutto: number
  } {
    const zwischensumme = this.berechneZwischensumme(positionen)
    const rabatt = this.berechneRabatt(zwischensumme, rabattProzent)
    const netto = this.berechneNetto(zwischensumme, rabatt)
    const mwstBetrag = this.berechneMwSt(netto, mwstSatz)
    const brutto = this.berechneBrutto(netto, mwstBetrag)

    return {
      zwischensumme,
      rabatt,
      netto,
      mwstBetrag,
      brutto
    }
  }
}

