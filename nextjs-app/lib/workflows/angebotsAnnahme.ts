import { getDatabase } from '@/lib/db/client'
import { Angebot, Projekt } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

/**
 * Workflow: Angebots-Annahme
 * 
 * Wird ausgeführt wenn ein Angebot angenommen wird:
 * 1. Angebot-Status auf "angenommen" setzen
 * 2. Automatisch ein neues Projekt aus dem Angebot erstellen
 * 3. Projektnummer generieren
 * 4. Kunde und Positionen übernehmen
 * 5. Vorkalkulation aus Angebot erstellen (NEU)
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

      // 3. Vorkalkulation aus Angebot erstellen
      const parameter = await KalkulationService.getKalkulationsParameter()
      
      // Berechne Netto OHNE Einheitspreise (E.P. / Miete)
      // Nur feste Positionen werden in die Vorkalkulation einbezogen
      const nettoOhneEP = angebot.positionen
        ?.filter(pos => 
          pos.preisTyp !== 'einheitspreis' && 
          pos.typ !== 'miete'
        )
        .reduce((sum, pos) => sum + (pos.gesamtpreis || 0), 0) || angebot.netto
      
      console.log(`[Angebots-Annahme] Netto gesamt: ${angebot.netto}, Netto ohne E.P.: ${nettoOhneEP}`)
      
      // Versuche Stunden aus Angebot zu schätzen (OHNE Einheitspreise)
      // Gesamt-Umsatz (ohne E.P.) / Stundensatz = Gesamt-Stunden
      const geschaetzteGesamtStunden = nettoOhneEP / parameter.standardStundensatz
      
      // Verteile nach 70/30 Regel
      const sollStundenAufbau = geschaetzteGesamtStunden * (parameter.verteilungsfaktor.aufbau / 100)
      const sollStundenAbbau = geschaetzteGesamtStunden * (parameter.verteilungsfaktor.abbau / 100)
      
      const sollUmsatzAufbau = sollStundenAufbau * parameter.standardStundensatz
      const sollUmsatzAbbau = sollStundenAbbau * parameter.standardStundensatz
      
      const gesamtSollStunden = KalkulationService.berechneGewichteteStunden(
        sollStundenAufbau,
        sollStundenAbbau,
        parameter.verteilungsfaktor
      )
      
      const gesamtSollUmsatz = KalkulationService.berechneGewichteteStunden(
        sollUmsatzAufbau,
        sollUmsatzAbbau,
        parameter.verteilungsfaktor
      )
      
      // 4. Bauvorhabeninformationen von Anfrage holen (falls vorhanden)
      let bauvorhaben: Projekt['bauvorhaben'] = {
        adresse: angebot.kundeAdresse || '',
        plz: '',
        ort: '',
        beschreibung: `Automatisch erstellt aus Angebot ${angebot.angebotsnummer}`,
        arbeitstypen: {
          dach: false,
          fassade: false,
          daemmung: false,
          sonderaufbau: false
        },
        geruestseiten: {
          vorderseite: false,
          rueckseite: false,
          rechts: false,
          links: false
        }
      }
      
      // Falls Angebot von einer Anfrage stammt, Bauvorhabeninformationen übernehmen
      if (angebot.anfrageId) {
        try {
          const anfrage = await db.collection('anfragen').findOne({ _id: new ObjectId(angebot.anfrageId) })
          if (anfrage) {
            bauvorhaben = {
              adresse: anfrage.bauvorhaben?.strasse || '',
              plz: anfrage.bauvorhaben?.plz || '',
              ort: anfrage.bauvorhaben?.ort || '',
              beschreibung: anfrage.bauvorhaben?.objektname || '',
              arbeitstypen: {
                dach: anfrage.artDerArbeiten?.dachdecker || false,
                fassade: anfrage.artDerArbeiten?.fassade || false,
                daemmung: anfrage.artDerArbeiten?.daemmung || false,
                sonderaufbau: anfrage.artDerArbeiten?.sonstige || false,
                beschreibung: anfrage.artDerArbeiten?.sonstigeText || ''
              },
              geruestseiten: {
                vorderseite: anfrage.geruestseiten?.vorderseite || false,
                rueckseite: anfrage.geruestseiten?.rueckseite || false,
                rechts: anfrage.geruestseiten?.rechteSeite || false,
                links: anfrage.geruestseiten?.linkeSeite || false,
                gesamtflaeche: anfrage.geruestseiten?.gesamtflaeche || 0
              },
              besonderheiten: anfrage.bauvorhaben?.besonderheiten || '',
              zufahrtsbeschraenkungen: '',
              bauzeitraum: '',
              sicherheitsanforderungen: ''
            }
            console.log(`[Angebots-Annahme] Bauvorhabeninformationen von Anfrage ${angebot.anfrageId} übernommen`)
          }
        } catch (error) {
          console.error('[Angebots-Annahme] Fehler beim Laden der Anfrage:', error)
        }
      }
      
      // 5. Projekt aus Angebot erstellen (mit neuem Schema)
      const neuesProjekt: Projekt = {
        projektnummer,
        projektname: angebot.betreff || `Projekt ${angebot.kundeName}`,
        
        // Bauvorhaben-Informationen (von Anfrage oder Platzhalter)
        bauvorhaben,
        
        // Verknüpfungen
        kundeId: angebot.kundeId,
        kundeName: angebot.kundeName,
        angebotId: angebotId,
        angebotsnummer: angebot.angebotsnummer,
        anfrageIds: angebot.anfrageId ? [angebot.anfrageId] : [],
        
        // Termine
        startdatum: new Date(),
        enddatum: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 Tage Default
        
        // Status & Verwaltung
        status: 'in_planung',
        zugewieseneMitarbeiter: [],
        
        // Finanzen
        angebotssumme: angebot.brutto,
        bereitsAbgerechnet: 0,
        offenerBetrag: angebot.brutto,
        budget: nettoOhneEP, // Budget ohne Einheitspreise
        istKosten: 0,
        fortschritt: 0,
        
        // Vorkalkulation (NEU)
        vorkalkulation: {
          sollStundenAufbau: Math.round(sollStundenAufbau),
          sollStundenAbbau: Math.round(sollStundenAbbau),
          sollUmsatzAufbau: Math.round(sollUmsatzAufbau),
          sollUmsatzAbbau: Math.round(sollUmsatzAbbau),
          stundensatz: parameter.standardStundensatz,
          gesamtSollStunden: Math.round(gesamtSollStunden),
          gesamtSollUmsatz: Math.round(gesamtSollUmsatz),
          erstelltAm: new Date(),
          erstelltVon: 'system',
          quelle: 'angebot',
          angebotId: angebotId
        },
        
        // Dokumente
        dokumente: [],
        
        // Aktivitäten
        aktivitaeten: [
          {
            aktion: 'Projekt erstellt',
            benutzer: 'system',
            zeitpunkt: new Date(),
            details: `Automatisch erstellt aus Angebot ${angebot.angebotsnummer}`,
            typ: 'projekt'
          }
        ],
        
        // Metadaten
        notizen: '',
        erstelltAm: new Date(),
        zuletztGeaendert: new Date(),
        erstelltVon: 'system',
        tags: ['aus-angebot']
      }

      const projektResult = await projekteCollection.insertOne(neuesProjekt as any)

      // 5. Angebot aktualisieren
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

      // 6. Initiale Nachkalkulation berechnen (leer, da noch keine Zeiterfassungen)
      await KalkulationService.berechneNachkalkulation(projektResult.insertedId.toString())

      // 7. Automatische Neuberechnung mit aktuellem Mitarbeiterstand triggern
      // (Falls später Mitarbeiter zugewiesen werden, wird dies erneut getriggert)
      try {
        // Nutze den neuen Auto-Berechnen Endpunkt für zukünftige Updates
        // Initial ist bereits die Vorkalkulation gesetzt, aber bei Mitarbeiter-Änderungen
        // sollte dieser Endpunkt aufgerufen werden
      } catch (error) {
        console.warn('Konnte automatische Neuberechnung nicht triggern:', error)
        // Nicht kritisch, Vorkalkulation ist bereits gesetzt
      }

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

