import { getDatabase } from '@/lib/db/client'
import { Angebot, Projekt } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

/**
 * Workflow: Angebots-Annahme
 * 
 * Wird ausgeführt wenn ein Angebot angenommen wird:
 * 1. Angebot-Status auf "angenommen" setzen
 * 2. Automatisch ein neues Projekt aus dem Angebot erstellen
 * 3. Projektnummer generieren
 * 4. Kunde und Positionen übernehmen
 */

export class AngebotsAnnahmeWorkflow {
  static async ausfuehren(angebotId: string): Promise<{ erfolg: boolean; projektId?: string; fehler?: string }> {
    try {
      const db = await getDatabase()
      const angeboteCollection = db.collection<Angebot>('angebote')
      const projekteCollection = db.collection<Projekt>('projekte')

      // 1. Angebot abrufen
      const angebot = await angeboteCollection.findOne({ _id: new ObjectId(angebotId) })
      if (!angebot) {
        return { erfolg: false, fehler: 'Angebot nicht gefunden' }
      }

      if (angebot.status === 'angenommen') {
        return { erfolg: false, fehler: 'Angebot wurde bereits angenommen' }
      }

      // 2. Projektnummer generieren
      const jahr = new Date().getFullYear()
      const projektCount = await projekteCollection.countDocuments({ 
        projektnummer: new RegExp(`^P-${jahr}-`) 
      })
      const projektnummer = `P-${jahr}-${String(projektCount + 1).padStart(3, '0')}`

      // 3. Projekt aus Angebot erstellen
      const neuesProjekt: Projekt = {
        projektnummer,
        projektname: angebot.betreff || `Projekt ${angebot.kundeName}`,
        kundeId: angebot.kundeId,
        kundeName: angebot.kundeName,
        standort: '', // Muss später ergänzt werden
        ansprechpartner: {
          name: '',
          telefon: '',
          email: ''
        },
        beginn: new Date(),
        ende: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 Tage Default
        status: 'in_planung',
        beschreibung: `Automatisch erstellt aus Angebot ${angebot.angebotsnummer}`,
        zugewieseneMitarbeiter: [],
        budget: angebot.brutto,
        istKosten: 0,
        fortschritt: 0,
        dokumente: [],
        notizen: '',
        erstelltAm: new Date(),
        zuletztGeaendert: new Date(),
        erstelltVon: 'system',
        tags: ['aus-angebot']
      }

      const projektResult = await projekteCollection.insertOne(neuesProjekt as any)

      // 4. Angebot aktualisieren
      await angeboteCollection.updateOne(
        { _id: new ObjectId(angebotId) },
        {
          $set: {
            status: 'angenommen',
            angenommenAm: new Date(),
            projektId: projektResult.insertedId.toString(),
            zuletztGeaendert: new Date()
          }
        }
      )

      return { 
        erfolg: true, 
        projektId: projektResult.insertedId.toString() 
      }
    } catch (error) {
      console.error('Fehler im Angebots-Annahme-Workflow:', error)
      return { erfolg: false, fehler: 'Interner Fehler' }
    }
  }
}

