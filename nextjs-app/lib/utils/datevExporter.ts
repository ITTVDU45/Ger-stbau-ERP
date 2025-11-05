import { Rechnung } from '@/lib/db/types'

/**
 * DATEV-Export-Service
 * 
 * Exportiert Rechnungsdaten im DATEV-kompatiblen CSV-Format
 */

export class DatevExporter {
  /**
   * Exportiert Rechnungen im DATEV-Format
   */
  static async exportiereRechnungen(
    rechnungen: Rechnung[],
    zeitraumVon: Date,
    zeitraumBis: Date
  ): Promise<string> {
    // DATEV CSV-Header
    const header = [
      'Umsatz (ohne Soll/Haben-Kz)',
      'Soll/Haben-Kennzeichen',
      'WKZ Umsatz',
      'Kurs',
      'Basis-Umsatz',
      'WKZ Basis-Umsatz',
      'Konto',
      'Gegenkonto (ohne BU-Schlüssel)',
      'BU-Schlüssel',
      'Belegdatum',
      'Belegfeld 1',
      'Belegfeld 2',
      'Skonto',
      'Buchungstext'
    ].join(';')

    const rows = rechnungen.map(r => {
      return [
        r.brutto.toFixed(2).replace('.', ','),
        'S', // Soll
        'EUR',
        '',
        '',
        '',
        '8400', // Erlöskonto (Beispiel)
        '10000', // Debitorenkonto (Beispiel)
        '',
        this.formatiereDatum(r.rechnungsdatum),
        r.rechnungsnummer,
        '',
        '',
        `Rechnung ${r.rechnungsnummer} - ${r.kundeName}`
      ].join(';')
    })

    return [header, ...rows].join('\n')
  }

  /**
   * Formatiert ein Datum für DATEV (DDMM oder DDMMYY)
   */
  private static formatiereDatum(datum: Date): string {
    const d = new Date(datum)
    const tag = String(d.getDate()).padStart(2, '0')
    const monat = String(d.getMonth() + 1).padStart(2, '0')
    return `${tag}${monat}`
  }

  /**
   * Generiert den kompletten DATEV-Export als CSV-String
   */
  static async generiereExport(
    rechnungen: Rechnung[],
    von: Date,
    bis: Date
  ): Promise<string> {
    const gefiltert = rechnungen.filter(r => {
      const datum = new Date(r.rechnungsdatum)
      return datum >= von && datum <= bis && r.status !== 'entwurf' && r.status !== 'storniert'
    })

    return await this.exportiereRechnungen(gefiltert, von, bis)
  }
}

