// TypeScript Interfaces für KI-Kunden-Import Feature
// Wiederverwendbar in anderen Projekten

// Parameter für KI-Suche
export interface AiImportParams {
  branche: string                    // z.B. "Bauunternehmen"
  standort: string                   // z.B. "Berlin" oder "10115"
  radius?: number                    // Optional: Umkreis in km
  anzahlErgebnisse: 10 | 25 | 50 | 100 | 250 | 1000
  websiteAnalysieren: boolean
  kontaktdatenHinzufuegen: boolean
}

// Job-Status
export type JobStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'

// Job-Phase während der Ausführung
export type JobPhase = 'searching' | 'loading_details' | 'analyzing_websites' | 'extracting_contacts'

// Ein Import-Ergebnis
export interface AiImportResult {
  id: string                         // Temporäre ID
  externalId?: string                // z.B. place_id von Google
  firmenname: string
  standort: string                   // Stadt
  adresse?: {
    strasse?: string
    hausnummer?: string
    plz?: string
    ort?: string
    land?: string
  }
  branche?: string
  ansprechpartner?: {                // Ansprechpartner (falls verfügbar)
    vorname?: string
    nachname?: string
    position?: string
    telefon?: string
    email?: string
  }
  telefon?: string
  website?: string
  email?: string                     // Extrahiert aus Website
  websiteAnalyse?: {                 // Website-Analyse-Ergebnisse
    beschreibung?: string            // Zusammenfassung über das Unternehmen
    dienstleistungen?: string[]      // Liste von Dienstleistungen
    extractedEmails?: string[]       // Gefundene E-Mail-Adressen
    extractedPhones?: string[]       // Gefundene Telefonnummern
    ansprechpartner?: Array<{        // Gefundene Ansprechpartner
      name?: string
      position?: string
      email?: string
      telefon?: string
    }>
  }
  analyseScore?: number              // 0-100, Vollständigkeit
  istDuplikat?: boolean              // Ähnlicher Kunde existiert bereits
  duplikatKundeId?: string
}

// Job mit Ergebnissen
export interface CustomerImportJob {
  _id?: string                       // MongoDB ID (primär)
  jobId?: string                     // Backwards compatibility
  status: JobStatus
  params: AiImportParams
  progress: {
    current: number
    total: number
    phase: JobPhase
  }
  results: AiImportResult[]
  error?: string
  createdAt: Date
}

// Ausgewählte Ergebnisse für Import (Draft)
export interface CustomerDraft {
  source: 'ai_import'
  sourceMeta: {
    jobId: string
    externalId?: string
  }
  // Kunde-Basis-Felder
  firma: string
  kundentyp: 'gewerblich'
  aktiv: false                       // Immer inaktiv beim Import
  adresse?: {
    strasse?: string
    hausnummer?: string
    plz?: string
    ort?: string
    land?: string
  }
  telefon?: string
  email?: string
  notizen?: string
}

// Import-Ergebnis-Rückgabe
export interface ImportResult {
  erfolg: boolean
  importedCount: number
  errors?: string[]
}

// Modus-Typen
export type CustomerDialogMode = 'manual' | 'ai'

