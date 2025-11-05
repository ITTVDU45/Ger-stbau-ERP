import { getDatabase } from '@/lib/db/client'
import { Rechnung, Termin } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { EmailSender } from '@/lib/utils/emailSender'
import { PdfGenerator } from '@/lib/utils/pdfGenerator'

/**
 * Workflow: Rechnungs-Versand
 * 
 * Wird ausgeführt wenn eine Rechnung versendet wird:
 * 1. Rechnung-Status auf "gesendet" setzen
 * 2. PDF generieren
 * 3. E-Mail versenden
 * 4. Fälligkeits-Termin im Kalender anlegen
 * 5. Eintrag in Buchhaltung erstellen (später)
 */

export class RechnungsVersandWorkflow {
  static async ausfuehren(
    rechnungId: string,
    empfaengerEmail: string
  ): Promise<{ erfolg: boolean; fehler?: string }> {
    try {
      const db = await getDatabase()
      const rechnungenCollection = db.collection<Rechnung>('rechnungen')
      const termineCollection = db.collection<Termin>('termine')

      // 1. Rechnung abrufen
      const rechnung = await rechnungenCollection.findOne({ _id: new ObjectId(rechnungId) })
      if (!rechnung) {
        return { erfolg: false, fehler: 'Rechnung nicht gefunden' }
      }

      // 2. PDF generieren
      const pdfBuffer = await PdfGenerator.generiereRechnungPdf(rechnung)

      // 3. E-Mail versenden
      const emailErfolg = await EmailSender.sendeRechnung(
        empfaengerEmail,
        rechnung.rechnungsnummer,
        pdfBuffer
      )

      if (!emailErfolg) {
        return { erfolg: false, fehler: 'E-Mail konnte nicht versendet werden' }
      }

      // 4. Rechnung-Status aktualisieren
      await rechnungenCollection.updateOne(
        { _id: new ObjectId(rechnungId) },
        {
          $set: {
            status: 'gesendet',
            versandtAm: new Date(),
            versandtAn: empfaengerEmail,
            zuletztGeaendert: new Date()
          }
        }
      )

      // 5. Fälligkeits-Termin im Kalender anlegen
      const faelligkeitsTermin: Termin = {
        titel: `Rechnung ${rechnung.rechnungsnummer} fällig`,
        beschreibung: `Zahlungseingang von ${rechnung.kundeName} erwarten`,
        start: rechnung.faelligAm,
        ende: rechnung.faelligAm,
        ganztaegig: true,
        typ: 'faelligkeit',
        projektId: rechnung.projektId,
        notizen: `Betrag: ${rechnung.brutto.toLocaleString('de-DE')} €`,
        erstelltAm: new Date(),
        zuletztGeaendert: new Date(),
        erstelltVon: 'system',
        farbe: '#f59e0b' // Orange
      }

      await termineCollection.insertOne(faelligkeitsTermin as any)

      return { erfolg: true }
    } catch (error) {
      console.error('Fehler im Rechnungs-Versand-Workflow:', error)
      return { erfolg: false, fehler: 'Interner Fehler' }
    }
  }
}

