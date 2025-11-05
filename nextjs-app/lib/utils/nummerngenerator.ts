/**
 * Generiert automatische Nummern für Angebote, Rechnungen, Projekte, etc.
 */

import { getDatabase } from '@/lib/db/client'

export class Nummerngenerator {
  /**
   * Generiert eine Angebotsnummer im Format: A-JAHR-LFDNR
   * z.B. A-2024-0001
   */
  static async generiereAngebotsnummer(): Promise<string> {
    const jahr = new Date().getFullYear()
    const db = await getDatabase()
    
    const letztes = await db.collection('angebote')
      .find({ angebotsnummer: new RegExp(`^A-${jahr}-`) })
      .sort({ angebotsnummer: -1 })
      .limit(1)
      .toArray()
    
    let lfdNr = 1
    if (letztes.length > 0) {
      const match = letztes[0].angebotsnummer.match(/A-\d{4}-(\d+)/)
      if (match) {
        lfdNr = parseInt(match[1]) + 1
      }
    }
    
    return `A-${jahr}-${String(lfdNr).padStart(4, '0')}`
  }

  /**
   * Generiert eine Rechnungsnummer im Format: R-JAHR-LFDNR
   * z.B. R-2024-0001
   */
  static async generiereRechnungsnummer(): Promise<string> {
    const jahr = new Date().getFullYear()
    const db = await getDatabase()
    
    const letztes = await db.collection('rechnungen')
      .find({ rechnungsnummer: new RegExp(`^R-${jahr}-`) })
      .sort({ rechnungsnummer: -1 })
      .limit(1)
      .toArray()
    
    let lfdNr = 1
    if (letztes.length > 0) {
      const match = letztes[0].rechnungsnummer.match(/R-\d{4}-(\d+)/)
      if (match) {
        lfdNr = parseInt(match[1]) + 1
      }
    }
    
    return `R-${jahr}-${String(lfdNr).padStart(4, '0')}`
  }

  /**
   * Generiert eine Projektnummer im Format: P-JAHR-LFDNR
   * z.B. P-2024-001
   */
  static async generiereProjektnummer(): Promise<string> {
    const jahr = new Date().getFullYear()
    const db = await getDatabase()
    
    const letztes = await db.collection('projekte')
      .find({ projektnummer: new RegExp(`^P-${jahr}-`) })
      .sort({ projektnummer: -1 })
      .limit(1)
      .toArray()
    
    let lfdNr = 1
    if (letztes.length > 0) {
      const match = letztes[0].projektnummer.match(/P-\d{4}-(\d+)/)
      if (match) {
        lfdNr = parseInt(match[1]) + 1
      }
    }
    
    return `P-${jahr}-${String(lfdNr).padStart(3, '0')}`
  }

  /**
   * Generiert eine Kundennummer im Format: K-LFDNR
   * z.B. K-00001
   */
  static async generiereKundennummer(): Promise<string> {
    const db = await getDatabase()
    
    const letztes = await db.collection('kunden')
      .find({ kundennummer: new RegExp(`^K-`) })
      .sort({ kundennummer: -1 })
      .limit(1)
      .toArray()
    
    let lfdNr = 1
    if (letztes.length > 0 && letztes[0].kundennummer) {
      const match = letztes[0].kundennummer.match(/K-(\d+)/)
      if (match) {
        lfdNr = parseInt(match[1]) + 1
      }
    }
    
    return `K-${String(lfdNr).padStart(5, '0')}`
  }

  /**
   * Generiert eine Personalnummer im Format: M-LFDNR
   * z.B. M-001
   */
  static async generierePersonalnummer(): Promise<string> {
    const db = await getDatabase()
    
    const letztes = await db.collection('mitarbeiter')
      .find({ personalnummer: new RegExp(`^M-`) })
      .sort({ personalnummer: -1 })
      .limit(1)
      .toArray()
    
    let lfdNr = 1
    if (letztes.length > 0 && letztes[0].personalnummer) {
      const match = letztes[0].personalnummer.match(/M-(\d+)/)
      if (match) {
        lfdNr = parseInt(match[1]) + 1
      }
    }
    
    return `M-${String(lfdNr).padStart(3, '0')}`
  }
}

