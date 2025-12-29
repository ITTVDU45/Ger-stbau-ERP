import { getDatabase } from '@/lib/db/client'
import { 
  Nachkalkulation, 
  Vorkalkulation, 
  MitarbeiterKalkulation, 
  KalkulationsParameter, 
  Zeiterfassung,
  Projekt,
  CompanySettings
} from '@/lib/db/types'
import { ObjectId } from 'mongodb'

/**
 * KalkulationService
 * 
 * Verantwortlich für die Berechnung der Nachkalkulation aus Zeiterfassungsdaten.
 * Berechnet automatisch Soll-Ist-Vergleiche, gewichtete Werte (70/30 Aufbau/Abbau),
 * Abweichungen und Status (Grün/Gelb/Rot).
 */
export class KalkulationService {
  /**
   * Holt die globalen Kalkulationsparameter aus den Einstellungen
   */
  static async getKalkulationsParameter(): Promise<KalkulationsParameter> {
    try {
      const db = await getDatabase()
      const settings = await db.collection<CompanySettings>('company_settings').findOne({})
      
      // Falls keine Einstellungen vorhanden oder keine Kalkulationsparameter, Standardwerte zurückgeben
      if (!settings?.kalkulationsParameter) {
        return this.getDefaultKalkulationsParameter()
      }
      
      return settings.kalkulationsParameter
    } catch (error) {
      console.error('Fehler beim Abrufen der Kalkulationsparameter:', error)
      return this.getDefaultKalkulationsParameter()
    }
  }

  /**
   * Standardwerte für Kalkulationsparameter
   */
  static getDefaultKalkulationsParameter(): KalkulationsParameter {
    return {
      standardStundensatz: 72,
      verteilungsfaktor: {
        aufbau: 70,
        abbau: 30
      },
      rundungsregel: 'kaufmaennisch',
      farbschwellen: {
        gruen: { min: 95, max: 105 },
        gelb: { min: 90, max: 110 },
        rot: { min: 0, max: 200 }
      },
      aktiv: true,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
  }

  /**
   * Holt alle Zeiterfassungen für ein Projekt, gruppiert nach Aufbau/Abbau
   */
  static async getZeiterfassungenFuerProjekt(projektId: string): Promise<{
    aufbau: Zeiterfassung[]
    abbau: Zeiterfassung[]
    alle: Zeiterfassung[]
  }> {
    try {
      const db = await getDatabase()
      
      // Stelle sicher, dass projektId als String verglichen wird
      // (Zeiterfassungen speichern projektId als String)
      const zeiterfassungen = await db.collection<Zeiterfassung>('zeiterfassung')
        .find({ 
          projektId: projektId.toString(), // Explizit als String
          status: 'freigegeben' // Nur freigegebene Zeiten
        })
        .toArray()
      
      console.log(`[Nachkalkulation] Gefundene freigegebene Zeiterfassungen für Projekt ${projektId}: ${zeiterfassungen.length}`)
      if (zeiterfassungen.length > 0) {
        console.log(`[Nachkalkulation] Zeiterfassungen Details:`, zeiterfassungen.map(z => ({
          id: z._id,
          stunden: z.stunden,
          taetigkeitstyp: z.taetigkeitstyp || 'undefined (wird als aufbau behandelt)',
          status: z.status,
          projektId: z.projektId
        })))
      }
      
      // Fallback: Zeiterfassungen ohne taetigkeitstyp werden als 'aufbau' behandelt
      const aufbau = zeiterfassungen.filter(z => 
        z.taetigkeitstyp === 'aufbau' || !z.taetigkeitstyp
      )
      const abbau = zeiterfassungen.filter(z => z.taetigkeitstyp === 'abbau')
      
      console.log(`[Nachkalkulation] Aufbau: ${aufbau.length} Einträge (${aufbau.reduce((sum, z) => sum + z.stunden, 0)} h)`)
      console.log(`[Nachkalkulation] Abbau: ${abbau.length} Einträge (${abbau.reduce((sum, z) => sum + z.stunden, 0)} h)`)
      
      return { aufbau, abbau, alle: zeiterfassungen }
    } catch (error) {
      console.error('Fehler beim Abrufen der Zeiterfassungen:', error)
      return { aufbau: [], abbau: [], alle: [] }
    }
  }

  /**
   * Berechnet gewichtete Summen (z.B. 70% Aufbau, 30% Abbau)
   */
  static berechneGewichteteStunden(
    aufbau: number, 
    abbau: number, 
    gewichtung: { aufbau: number, abbau: number }
  ): number {
    const aufbauFaktor = gewichtung.aufbau / 100
    const abbauFaktor = gewichtung.abbau / 100
    return (aufbau * aufbauFaktor) + (abbau * abbauFaktor)
  }

  /**
   * Ermittelt den Farb-Status basierend auf der Abweichung
   */
  static ermittleStatus(
    abweichungProzent: number, 
    farbschwellen: KalkulationsParameter['farbschwellen']
  ): 'gruen' | 'gelb' | 'rot' {
    const absolut = Math.abs(abweichungProzent)
    
    // Grün: Abweichung im akzeptablen Bereich
    if (absolut >= farbschwellen.gruen.min && absolut <= farbschwellen.gruen.max) {
      return 'gruen'
    }
    
    // Gelb: Abweichung kritisch aber noch akzeptabel
    if (absolut >= farbschwellen.gelb.min && absolut <= farbschwellen.gelb.max) {
      return 'gelb'
    }
    
    // Rot: Abweichung zu hoch
    return 'rot'
  }

  /**
   * Rundet einen Wert basierend auf der Rundungsregel
   */
  static rundeWert(wert: number, regel: KalkulationsParameter['rundungsregel']): number {
    switch (regel) {
      case 'auf':
        return Math.ceil(wert)
      case 'ab':
        return Math.floor(wert)
      case 'kaufmaennisch':
      default:
        return Math.round(wert)
    }
  }

  /**
   * Berechnet die Mitarbeiter-Kalkulation
   */
  static async berechneMitarbeiterKalkulation(
    projektId: string, 
    vorkalkulation: Vorkalkulation, 
    zeiterfassungen: Zeiterfassung[],
    parameter: KalkulationsParameter,
    zugewieseneMitarbeiter: { mitarbeiterId: string, mitarbeiterName: string }[],
    mitarbeiterHabenKorrekturen: boolean = false
  ): Promise<MitarbeiterKalkulation[]> {
    try {
      // Wenn nicht explizit übergeben, prüfe ob zugewiesene Mitarbeiter Korrektur-Stunden haben
      if (!mitarbeiterHabenKorrekturen) {
        mitarbeiterHabenKorrekturen = zugewieseneMitarbeiter.some(
          (m: any) => (m.stundenAufbau !== undefined && m.stundenAufbau !== null) || 
                      (m.stundenAbbau !== undefined && m.stundenAbbau !== null)
        )
      }
      
      // Basis: zugewiesene Mitarbeiter mit 0h hinzufügen (damit alle angezeigt werden)
      const mitarbeiterMap = new Map<string, { name: string, stunden: number }>()
      ;(zugewieseneMitarbeiter || []).forEach((m: any) => {
        if (m.mitarbeiterId) {
          // Verwende entweder korrigierte Stunden ODER Zeiterfassungen
          if (mitarbeiterHabenKorrekturen) {
            // Verwende korrigierte Stunden aus Mitarbeiter-Zuweisungen
            const gesamtStunden = (m.stundenAufbau || 0) + (m.stundenAbbau || 0)
            mitarbeiterMap.set(m.mitarbeiterId, { name: m.mitarbeiterName, stunden: gesamtStunden })
          } else {
            // Initialisiere mit 0, wird durch Zeiterfassungen gefüllt
            mitarbeiterMap.set(m.mitarbeiterId, { name: m.mitarbeiterName, stunden: 0 })
          }
        }
      })
      
      // Wenn KEINE Korrekturen vorhanden: Gruppiere Zeiterfassungen nach Mitarbeiter
      if (!mitarbeiterHabenKorrekturen) {
        zeiterfassungen.forEach(z => {
          if (!z.mitarbeiterId) return
          const existing = mitarbeiterMap.get(z.mitarbeiterId) || { name: z.mitarbeiterName, stunden: 0 }
          existing.stunden += z.stunden
          mitarbeiterMap.set(z.mitarbeiterId, existing)
        })
      }
      
      // Zähle Mitarbeiter SEPARAT für Aufbau und Abbau
      const mitarbeiterAufbau = zugewieseneMitarbeiter.filter((m: any) => 
        (m.stundenAufbau !== undefined && m.stundenAufbau !== null && m.stundenAufbau > 0)
      ).length || 1
      
      const mitarbeiterAbbau = zugewieseneMitarbeiter.filter((m: any) => 
        (m.stundenAbbau !== undefined && m.stundenAbbau !== null && m.stundenAbbau > 0)
      ).length || 1

      // Berechne Soll-Stunden PRO MA für jeden Prozess separat
      const sollStundenAufbauProMA = mitarbeiterAufbau > 0 
        ? vorkalkulation.sollStundenAufbau / mitarbeiterAufbau 
        : 0
      
      const sollStundenAbbauProMA = mitarbeiterAbbau > 0 
        ? vorkalkulation.sollStundenAbbau / mitarbeiterAbbau 
        : 0
      
      // auf eine Nachkommastelle runden
      const round1 = (v: number) => Math.round(v * 10) / 10
      
      // Gruppiere Zeiterfassungen nach Mitarbeiter und Typ für schnellen Zugriff
      const zeiterfassungenProMA = new Map<string, { aufbau: number, abbau: number }>()
      zeiterfassungen.forEach(z => {
        if (!z.mitarbeiterId) return
        const existing = zeiterfassungenProMA.get(z.mitarbeiterId) || { aufbau: 0, abbau: 0 }
        if (z.taetigkeitstyp === 'aufbau' || !z.taetigkeitstyp) {
          existing.aufbau += z.stunden
        } else if (z.taetigkeitstyp === 'abbau') {
          existing.abbau += z.stunden
        }
        zeiterfassungenProMA.set(z.mitarbeiterId, existing)
      })
      
      // Erstelle Kalkulation für jeden Mitarbeiter
      const ergebnis: MitarbeiterKalkulation[] = []
      
      mitarbeiterMap.forEach((data, mitarbeiterId) => {
        // Prüfe, ob dieser Mitarbeiter bei Aufbau/Abbau beteiligt ist
        const mitarbeiterInfo = zugewieseneMitarbeiter.find((m: any) => m.mitarbeiterId === mitarbeiterId)
        const zeiterfassungenMA = zeiterfassungenProMA.get(mitarbeiterId) || { aufbau: 0, abbau: 0 }
        
        let istBeiAufbau = false
        let istBeiAbbau = false
        
        if (mitarbeiterHabenKorrekturen && mitarbeiterInfo) {
          // Fall 1: Verwende Korrektur-Stunden zur Bestimmung
          istBeiAufbau = (mitarbeiterInfo.stundenAufbau || 0) > 0
          istBeiAbbau = (mitarbeiterInfo.stundenAbbau || 0) > 0
        } else {
          // Fall 2: Verwende Zeiterfassungen zur Bestimmung
          istBeiAufbau = zeiterfassungenMA.aufbau > 0
          istBeiAbbau = zeiterfassungenMA.abbau > 0
        }
        
        // Berechne individuelles Soll für diesen Mitarbeiter
        let zeitSoll = 0
        let zeitSollAufbau = 0
        let zeitSollAbbau = 0
        
        if (istBeiAufbau) {
          zeitSollAufbau = sollStundenAufbauProMA
          zeitSoll += sollStundenAufbauProMA
        }
        if (istBeiAbbau) {
          zeitSollAbbau = sollStundenAbbauProMA
          zeitSoll += sollStundenAbbauProMA
        }
        
        // Berechne IST-Stunden getrennt nach Aufbau/Abbau
        let zeitIstAufbau = 0
        let zeitIstAbbau = 0
        
        if (mitarbeiterHabenKorrekturen && mitarbeiterInfo) {
          // Verwende korrigierte Werte
          zeitIstAufbau = mitarbeiterInfo.stundenAufbau || 0
          zeitIstAbbau = mitarbeiterInfo.stundenAbbau || 0
        } else {
          // Verwende Zeiterfassungen
          const maZeiterfassungen = zeiterfassungen.filter(z => z.mitarbeiterId === mitarbeiterId)
          zeitIstAufbau = maZeiterfassungen
            .filter(z => z.taetigkeitstyp === 'aufbau' || !z.taetigkeitstyp)
            .reduce((sum, z) => sum + z.stunden, 0)
          zeitIstAbbau = maZeiterfassungen
            .filter(z => z.taetigkeitstyp === 'abbau')
            .reduce((sum, z) => sum + z.stunden, 0)
        }
        
        // DEBUG: Log Mitarbeiter-Kalkulation Details
        console.log('[Mitarbeiter-Kalkulation] Details pro MA:', {
          mitarbeiterId,
          name: data.name,
          mitarbeiterHabenKorrekturen,
          zeiterfassungenMA,
          istBeiAufbau,
          istBeiAbbau,
          zeitSollAufbau,
          zeitSollAbbau,
          zeitIstAufbau,
          zeitIstAbbau,
          zeitSollGesamt: zeitSoll,
          zeitIstGesamt: zeitIstAufbau + zeitIstAbbau
        })
        
        zeitSoll = round1(zeitSoll)
        const zeitIst = round1(zeitIstAufbau + zeitIstAbbau)
        // Differenz: Soll - Ist (positiv = gut, negativ = schlecht)
        const differenzZeit = round1(zeitSoll - zeitIst)
        
        const summeSoll = round1(zeitSoll * vorkalkulation.stundensatz)
        const summeIst = round1(zeitIst * vorkalkulation.stundensatz)
        // Differenz: Soll - Ist (positiv = gut, negativ = schlecht)
        const differenzSumme = round1(summeSoll - summeIst)
        
        // Abweichung in Prozent (negativ = gut, positiv = schlecht)
        const abweichungProzent = zeitSoll > 0 
          ? round1(((zeitIst / zeitSoll - 1) * 100)) 
          : 0
        
        ergebnis.push({
          mitarbeiterId,
          mitarbeiterName: data.name,
          zeitSoll,
          zeitIst,
          differenzZeit,
          summeSoll,
          summeIst,
          differenzSumme,
          abweichungProzent,
          // NEU: Aufschlüsselung
          zeitSollAufbau: round1(zeitSollAufbau),
          zeitIstAufbau: round1(zeitIstAufbau),
          zeitSollAbbau: round1(zeitSollAbbau),
          zeitIstAbbau: round1(zeitIstAbbau)
        })
      })
      
      return ergebnis
    } catch (error) {
      console.error('Fehler bei der Mitarbeiter-Kalkulation:', error)
      return []
    }
  }

  /**
   * Berechnet die Nachkalkulation neu für ein Projekt
   */
  static async berechneNachkalkulation(projektId: string): Promise<Nachkalkulation | null> {
    try {
      const db = await getDatabase()
      
      // Hole Projekt mit Vorkalkulation
      const projekt = await db.collection<Projekt>('projekte').findOne({ _id: new ObjectId(projektId) })
      if (!projekt || !projekt.vorkalkulation) {
        console.warn('Projekt oder Vorkalkulation nicht gefunden:', projektId)
        return null
      }
      
      const vorkalkulation = projekt.vorkalkulation
      const parameter = await this.getKalkulationsParameter()
      
      // Hole Zeiterfassungen
      const { aufbau, abbau, alle } = await this.getZeiterfassungenFuerProjekt(projektId)
      
      // PRIORITÄT: Prüfe ob zugewiesene Mitarbeiter Korrektur-Stunden haben
      const zugewieseneMitarbeiter = projekt.zugewieseneMitarbeiter || []
      const mitarbeiterHabenKorrekturen = zugewieseneMitarbeiter.some(
        (m: any) => (m.stundenAufbau !== undefined && m.stundenAufbau !== null) || 
                    (m.stundenAbbau !== undefined && m.stundenAbbau !== null)
      )
      
      let istStundenAufbau: number
      let istStundenAbbau: number
      
      if (mitarbeiterHabenKorrekturen) {
        // Verwende korrigierte Werte aus zugewiesenen Mitarbeitern
        console.log('[Nachkalkulation] Verwende korrigierte Stunden aus Mitarbeiter-Zuweisungen')
        istStundenAufbau = zugewieseneMitarbeiter.reduce((sum: number, m: any) => 
          sum + (m.stundenAufbau || 0), 0)
        istStundenAbbau = zugewieseneMitarbeiter.reduce((sum: number, m: any) => 
          sum + (m.stundenAbbau || 0), 0)
        console.log(`[Nachkalkulation] Korrigierte Stunden: Aufbau ${istStundenAufbau}h, Abbau ${istStundenAbbau}h`)
      } else {
        // Verwende Stunden aus Zeiterfassungen (bisheriges Verhalten)
        console.log('[Nachkalkulation] Verwende Stunden aus Zeiterfassungen')
        istStundenAufbau = aufbau.reduce((sum, z) => sum + z.stunden, 0)
        istStundenAbbau = abbau.reduce((sum, z) => sum + z.stunden, 0)
        console.log(`[Nachkalkulation] Zeiterfassungs-Stunden: Aufbau ${istStundenAufbau}h, Abbau ${istStundenAbbau}h`)
      }
      
      // Berechne UNGEWICHTETE Gesamtstunden (einfache Summe)
      const gesamtIstStunden = istStundenAufbau + istStundenAbbau
      
      // Berechne Umsätze
      const istUmsatzAufbau = istStundenAufbau * vorkalkulation.stundensatz
      const istUmsatzAbbau = istStundenAbbau * vorkalkulation.stundensatz
      const gesamtIstUmsatz = istUmsatzAufbau + istUmsatzAbbau
      
      // Berechne Differenzen (Soll - Ist)
      // Positive Differenz = gut (weniger verbraucht als geplant)
      // Negative Differenz = schlecht (mehr verbraucht als geplant)
      const differenzStunden = vorkalkulation.gesamtSollStunden - gesamtIstStunden
      const differenzUmsatz = vorkalkulation.gesamtSollUmsatz - gesamtIstUmsatz
      
      // Berechne Abweichungen in Prozent (Ist / Soll - 1) * 100
      // Negative Werte = gut (weniger verbraucht)
      // Positive Werte = schlecht (mehr verbraucht)
      const abweichungStundenProzent = vorkalkulation.gesamtSollStunden > 0
        ? ((gesamtIstStunden / vorkalkulation.gesamtSollStunden - 1) * 100)
        : 0
      
      const abweichungUmsatzProzent = vorkalkulation.gesamtSollUmsatz > 0
        ? ((gesamtIstUmsatz / vorkalkulation.gesamtSollUmsatz - 1) * 100)
        : 0
      
      // Berechne Erfüllungsgrad (Ist / Soll × 100)
      // <100% = gut (weniger verbraucht als geplant)
      // >100% = schlecht (mehr verbraucht als geplant)
      const erfuellungsgrad = vorkalkulation.gesamtSollStunden > 0
        ? ((gesamtIstStunden / vorkalkulation.gesamtSollStunden) * 100)
        : 100
      
      // Ermittle Status
      const status = this.ermittleStatus(abweichungUmsatzProzent, parameter.farbschwellen)
      
      // Berechne Mitarbeiter-Auswertung
      const mitarbeiterAuswertung = await this.berechneMitarbeiterKalkulation(
        projektId, 
        vorkalkulation, 
        alle,
        parameter,
        zugewieseneMitarbeiter,
        mitarbeiterHabenKorrekturen
      )
      
      // Erstelle Nachkalkulation
      const nachkalkulation: Nachkalkulation = {
        istStundenAufbau: this.rundeWert(istStundenAufbau, parameter.rundungsregel),
        istStundenAbbau: this.rundeWert(istStundenAbbau, parameter.rundungsregel),
        istUmsatzAufbau: this.rundeWert(istUmsatzAufbau, parameter.rundungsregel),
        istUmsatzAbbau: this.rundeWert(istUmsatzAbbau, parameter.rundungsregel),
        gesamtIstStunden: this.rundeWert(gesamtIstStunden, parameter.rundungsregel),
        gesamtIstUmsatz: this.rundeWert(gesamtIstUmsatz, parameter.rundungsregel),
        differenzStunden: this.rundeWert(differenzStunden, parameter.rundungsregel),
        differenzUmsatz: this.rundeWert(differenzUmsatz, parameter.rundungsregel),
        abweichungStundenProzent: this.rundeWert(abweichungStundenProzent, parameter.rundungsregel),
        abweichungUmsatzProzent: this.rundeWert(abweichungUmsatzProzent, parameter.rundungsregel),
        erfuellungsgrad: this.rundeWert(erfuellungsgrad, parameter.rundungsregel),
        mitarbeiterAuswertung,
        letzteBerechnung: new Date(),
        status
      }
      
      // Speichere Nachkalkulation im Projekt
      await db.collection<Projekt>('projekte').updateOne(
        { _id: new ObjectId(projektId) },
        { 
          $set: { 
            nachkalkulation,
            zuletztGeaendert: new Date()
          } 
        }
      )
      
      // Speichere Verlaufsdaten
      await this.speichereKalkulationsVerlauf(projektId, nachkalkulation)
      
      return nachkalkulation
    } catch (error) {
      console.error('Fehler bei der Berechnung der Nachkalkulation:', error)
      return null
    }
  }

  /**
   * Speichert Verlaufsdaten für Charts
   */
  static async speichereKalkulationsVerlauf(
    projektId: string, 
    nachkalkulation: Nachkalkulation
  ): Promise<void> {
    try {
      const db = await getDatabase()
      
      const verlaufEintrag = {
        datum: new Date(),
        istStundenAufbau: nachkalkulation.istStundenAufbau,
        istStundenAbbau: nachkalkulation.istStundenAbbau,
        istUmsatzGesamt: nachkalkulation.gesamtIstUmsatz,
        erfuellungsgrad: nachkalkulation.erfuellungsgrad
      }
      
      // Füge Verlaufseintrag hinzu (max. 100 Einträge behalten)
      await db.collection<Projekt>('projekte').updateOne(
        { _id: new ObjectId(projektId) },
        { 
          $push: { 
            kalkulationsVerlauf: {
              $each: [verlaufEintrag],
              $slice: -100 // Behalte nur die letzten 100 Einträge
            }
          } as any
        }
      )
    } catch (error) {
      console.error('Fehler beim Speichern der Verlaufsdaten:', error)
    }
  }

  /**
   * Erstellt oder aktualisiert eine Vorkalkulation
   */
  static async speichereVorkalkulation(
    projektId: string,
    vorkalkulation: Omit<Vorkalkulation, 'erstelltAm' | 'erstelltVon'>,
    erstelltVon: string
  ): Promise<boolean> {
    try {
      const db = await getDatabase()
      const parameter = await this.getKalkulationsParameter()
      
      // Berechne UNGEWICHTETE Summen (einfache Addition)
      // Die Gewichtung (70/30) wird NUR in der Nachkalkulation für die Bewertung verwendet
      const gesamtSollStunden = vorkalkulation.sollStundenAufbau + vorkalkulation.sollStundenAbbau
      const gesamtSollUmsatz = vorkalkulation.sollUmsatzAufbau + vorkalkulation.sollUmsatzAbbau
      
      const vollstaendigeVorkalkulation: Vorkalkulation = {
        ...vorkalkulation,
        gesamtSollStunden: this.rundeWert(gesamtSollStunden, parameter.rundungsregel),
        gesamtSollUmsatz: this.rundeWert(gesamtSollUmsatz, parameter.rundungsregel),
        erstelltAm: new Date(),
        erstelltVon
      }
      
      const result = await db.collection<Projekt>('projekte').updateOne(
        { _id: new ObjectId(projektId) },
        { 
          $set: { 
            vorkalkulation: vollstaendigeVorkalkulation,
            zuletztGeaendert: new Date()
          } 
        }
      )
      
      return result.matchedCount > 0
    } catch (error) {
      console.error('Fehler beim Speichern der Vorkalkulation:', error)
      return false
    }
  }

  /**
   * Speichert oder aktualisiert Kalkulationsparameter in den Einstellungen
   */
  static async speichereKalkulationsParameter(
    parameter: Omit<KalkulationsParameter, '_id' | 'erstelltAm' | 'zuletztGeaendert'>
  ): Promise<boolean> {
    try {
      const db = await getDatabase()
      
      const vollstaendigeParameter: KalkulationsParameter = {
        ...parameter,
        erstelltAm: new Date(),
        zuletztGeaendert: new Date()
      }
      
      const result = await db.collection<CompanySettings>('company_settings').updateOne(
        {},
        { 
          $set: { 
            kalkulationsParameter: vollstaendigeParameter,
            zuletztGeaendert: new Date()
          } 
        },
        { upsert: true }
      )
      
      return result.matchedCount > 0 || result.upsertedCount > 0
    } catch (error) {
      console.error('Fehler beim Speichern der Kalkulationsparameter:', error)
      return false
    }
  }
}

