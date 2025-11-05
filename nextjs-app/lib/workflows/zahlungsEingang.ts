import { getDatabase } from '@/lib/db/client'
import { Rechnung, Projekt } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

/**
 * Workflow: Zahlungseingang
 * 
 * Wird ausgeführt wenn eine Zahlung eingeht:
 * 1. Rechnung-Status auf "bezahlt" setzen
 * 2. Bezahldatum eintragen
 * 3. Falls Projekt-Rechnung: Projekt-Status aktualisieren
 * 4. Kalender-Fälligkeits-Termin als erledigt markieren
 */

export class ZahlungsEingangWorkflow {
  static async ausfuehren(
    rechnungId: string,
    bezahltBetrag: number,
    bezahltAm: Date = new Date()
  ): Promise<{ erfolg: boolean; fehler?: string }> {
    try {
      const db = await getDatabase()
      const rechnungenCollection = db.collection<Rechnung>('rechnungen')
      const projekteCollection = db.collection<Projekt>('projekte')

      // 1. Rechnung abrufen
      const rechnung = await rechnungenCollection.findOne({ _id: new ObjectId(rechnungId) })
      if (!rechnung) {
        return { erfolg: false, fehler: 'Rechnung nicht gefunden' }
      }

      // 2. Status bestimmen
      let neuerStatus: 'bezahlt' | 'teilbezahlt' = 'bezahlt'
      if (bezahltBetrag < rechnung.brutto) {
        neuerStatus = 'teilbezahlt'
      }

      // 3. Rechnung aktualisieren
      await rechnungenCollection.updateOne(
        { _id: new ObjectId(rechnungId) },
        {
          $set: {
            status: neuerStatus,
            bezahltAm,
            bezahltBetrag,
            zuletztGeaendert: new Date()
          }
        }
      )

      // 4. Falls Schlussrechnung und vollständig bezahlt: Projekt als "abgerechnet" markieren
      if (rechnung.projektId && rechnung.typ === 'schlussrechnung' && neuerStatus === 'bezahlt') {
        await projekteCollection.updateOne(
          { _id: new ObjectId(rechnung.projektId) },
          {
            $set: {
              status: 'abgerechnet',
              zuletztGeaendert: new Date()
            }
          }
        )
      }

      return { erfolg: true }
    } catch (error) {
      console.error('Fehler im Zahlungseingang-Workflow:', error)
      return { erfolg: false, fehler: 'Interner Fehler' }
    }
  }
}

