// Datenbank-Typen für das Gerüstbau ERP System
// Diese Typen werden auf Client und Server verwendet

// ========================================
// AUTHENTIFIZIERUNG & AUTORISIERUNG
// ========================================

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

// Auth-User Interface (für das neue Auth-System)
export interface User {
  _id?: any // ObjectId wird zur Laufzeit konvertiert
  email: string
  firstName: string
  lastName: string
  role: UserRole
  passwordHash: string | null
  status: UserStatus
  emailVerifiedAt: Date | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  createdByUserId?: any | null
  
  // Erweiterte Profilfelder
  profile?: {
    telefon?: string
    geburtsdatum?: Date
    personalnummer?: string
    
    // Adresse
    adresse?: {
      strasse?: string
      hausnummer?: string
      plz?: string
      stadt?: string
      land?: string
    }
    
    // Notfallkontakt
    notfallkontakt?: {
      name?: string
      beziehung?: string
      telefon?: string
    }
    
    // Bankdaten (verschlüsselt speichern)
    bankdaten?: {
      iban?: string
      bic?: string
      bankname?: string
    }
    
    // Steuerliche Daten
    steuerDaten?: {
      steuerID?: string
      sozialversicherungsnummer?: string
    }
    
    // Profilbild
    profilbild?: {
      url?: string
      filename?: string
      uploadedAt?: Date
    }
  }
}

// Session Interface
export interface Session {
  userId: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

// Invitation Interface
export interface Invitation {
  _id?: any
  email: string
  firstName: string
  lastName: string
  role: UserRole
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  invitedByUserId: any
  createdAt: Date
}

// Audit Log Interface
export interface AuditLog {
  _id?: any
  userId: any
  action: string
  resource: string
  resourceId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

// ========================================
// GERÜSTBAU ERP - Neue Typen
// ========================================

// Mitarbeiter-Typen
export interface Mitarbeiter {
  _id?: string
  personalnummer?: string
  vorname: string
  nachname: string
  email: string
  telefon?: string
  adresse?: {
    strasse?: string
    hausnummer?: string
    plz?: string
    ort?: string
    land?: string
  }
  beschaeftigungsart: 'festangestellt' | 'aushilfe' | 'subunternehmer'
  eintrittsdatum: Date
  austrittsdatum?: Date
  aktiv: boolean
  qualifikationen: string[]
  stundensatz?: number
  wochenarbeitsstunden?: number
  // Urlaubsverwaltung
  jahresUrlaubstage?: number // z.B. 30 Tage pro Jahr
  genommenerUrlaub?: number // Automatisch berechnet aus genehmigten Urlaubsanträgen
  resturlaub?: number // Gecacht: jahresUrlaubstage - genommenerUrlaub
  verfuegbarkeiten?: {
    tag: string // 'montag', 'dienstag', etc.
    verfuegbar: boolean
    von?: string
    bis?: string
  }[]
  notizen?: string
  dokumente: Dokument[]
  erstelltAm: Date
  zuletztGeaendert: Date
  profilbildUrl?: string
  profilbildObjectName?: string
}

// Zeiterfassung
export interface Zeiterfassung {
  _id?: string
  mitarbeiterId: string
  mitarbeiterName: string // Denormalisiert für schnelle Anzeige
  projektId?: string
  projektName?: string // Denormalisiert für schnelle Anzeige
  datum: Date
  stunden: number
  pause?: number // Pause in Minuten
  von?: string // Uhrzeit von (z.B. "08:00")
  bis?: string // Uhrzeit bis (z.B. "17:00")
  taetigkeitstyp?: 'aufbau' | 'abbau' // NEU: Für Nachkalkulation
  status: 'offen' | 'freigegeben' | 'abgelehnt'
  beschreibung?: string
  notizen?: string
  freigegebenVon?: string
  freigegebenAm?: Date
  erstelltAm: Date
  zuletztGeaendert: Date
}

// Urlaub & Abwesenheiten
export interface Urlaub {
  _id?: string
  mitarbeiterId: string
  mitarbeiterName: string
  von: Date
  bis: Date
  anzahlTage: number
  typ: 'urlaub' | 'krankheit' | 'sonderurlaub' | 'unbezahlt' | 'sonstiges'
  status: 'beantragt' | 'genehmigt' | 'abgelehnt'
  grund?: string
  vertretung?: string // Mitarbeiter-ID der Vertretung
  vertretungName?: string
  genehmigungVon?: string
  genehmigungAm?: Date
  ablehnungsgrund?: string
  erstelltAm: Date
  zuletztGeaendert: Date
}

// ========================================
// KALKULATION & NACHKALKULATION
// ========================================

// Kalkulationsparameter (Globale Einstellungen)
export interface KalkulationsParameter {
  _id?: string
  standardStundensatz: number // z.B. 72 €/h
  verteilungsfaktor: {
    aufbau: number // Standard: 70
    abbau: number  // Standard: 30
  }
  rundungsregel: 'auf' | 'ab' | 'kaufmaennisch' // Standard: 'kaufmaennisch'
  farbschwellen: {
    gruen: { min: number, max: number } // z.B. 95-105%
    gelb: { min: number, max: number }  // z.B. 90-95% und 105-110%
    rot: { min: number, max: number }   // z.B. <90% und >110%
  }
  aktiv: boolean
  erstelltAm: Date
  zuletztGeaendert: Date
}

// Vorkalkulation (Teil des Projekts)
export interface Vorkalkulation {
  sollStundenAufbau: number
  sollStundenAbbau: number
  sollUmsatzAufbau: number  // berechnet aus sollStundenAufbau × Stundensatz
  sollUmsatzAbbau: number   // berechnet aus sollStundenAbbau × Stundensatz
  stundensatz: number       // Projekt-spezifisch oder aus globalen Einstellungen
  gesamtSollStunden: number // gewichtet: (Aufbau × 0.70) + (Abbau × 0.30)
  gesamtSollUmsatz: number  // gewichtet
  materialkosten?: number   // Optional
  gemeinkosten?: number     // Optional
  gewinn?: number          // Optional
  erstelltAm: Date
  erstelltVon: string
  quelle?: 'angebot' | 'manuell' // Woher stammen die Soll-Werte?
  angebotId?: string
}

// Mitarbeiter-Kalkulation (Detailauswertung pro Mitarbeiter)
export interface MitarbeiterKalkulation {
  mitarbeiterId: string
  mitarbeiterName: string
  zeitSoll: number      // Anteilig berechnet aus Gesamt-Soll
  zeitIst: number       // Tatsächliche Stunden aus Zeiterfassung
  differenzZeit: number // Ist - Soll
  summeSoll: number     // Zeit-Soll × Stundensatz
  summeIst: number      // Zeit-Ist × Stundensatz
  differenzSumme: number
  abweichungProzent: number
}

// Nachkalkulation (Teil des Projekts, automatisch berechnet)
export interface Nachkalkulation {
  istStundenAufbau: number      // Summe aus Zeiterfassung (typ: 'aufbau')
  istStundenAbbau: number       // Summe aus Zeiterfassung (typ: 'abbau')
  istUmsatzAufbau: number       // berechnet aus istStundenAufbau × Stundensatz
  istUmsatzAbbau: number        // berechnet aus istStundenAbbau × Stundensatz
  gesamtIstStunden: number      // gewichtet: (Aufbau × 0.70) + (Abbau × 0.30)
  gesamtIstUmsatz: number       // gewichtet
  differenzStunden: number      // Ist - Soll
  differenzUmsatz: number       // Ist - Soll
  abweichungStundenProzent: number // (Ist / Soll - 1) × 100
  abweichungUmsatzProzent: number  // (Ist / Soll - 1) × 100
  erfuellungsgrad: number       // Soll / Ist × 100
  mitarbeiterAuswertung: MitarbeiterKalkulation[]
  letzteBerechnung: Date
  status: 'gruen' | 'gelb' | 'rot' // Basierend auf farbschwellen
}

// Projekt
export interface Projekt {
  _id?: string
  projektnummer: string
  projektname: string
  
  // Bauvorhaben-Informationen
  bauvorhaben: {
    adresse: string
    plz: string
    ort: string
    beschreibung: string
    arbeitstypen: {
      dach: boolean
      fassade: boolean
      daemmung: boolean
      sonderaufbau: boolean
      beschreibung?: string
    }
    geruestseiten: {
      vorderseite: boolean
      rueckseite: boolean
      rechts: boolean
      links: boolean
      gesamtflaeche?: number
    }
    besonderheiten?: string
    zufahrtsbeschraenkungen?: string
    bauzeitraum?: string
    sicherheitsanforderungen?: string
  }
  
  // Verknüpfungen
  kundeId: string
  kundeName: string
  kundenAnsprechpartner?: string
  angebotId?: string // Zugewiesenes Angebot
  angebotsnummer?: string
  anfrageIds?: string[] // Zugewiesene Anfragen
  
  // Termine
  startdatum?: Date
  enddatum?: Date
  geplantesEnddatum?: Date
  
  // Status & Verwaltung
  status: 'in_planung' | 'aktiv' | 'in_abrechnung' | 'abgeschlossen' | 'pausiert'
  verantwortlicher?: string // Mitarbeiter-ID
  bauleiter?: string
  zugewieseneMitarbeiter?: {
    mitarbeiterId: string
    mitarbeiterName: string
    rolle?: string
    von?: Date
    bis?: Date
    // Neue getrennte Zeiträume und Stunden
    aufbauVon?: Date
    aufbauBis?: Date
    abbauVon?: Date
    abbauBis?: Date
    stundenAufbau?: number  // Admin-Korrektur für Aufbau-Stunden
    stundenAbbau?: number   // Admin-Korrektur für Abbau-Stunden
  }[]
  
  // Finanzen
  angebotssumme?: number
  bereitsAbgerechnet?: number
  offenerBetrag?: number
  budget?: number
  istKosten?: number
  fortschritt?: number // 0-100%
  
  // Dokumente
  dokumente?: Array<{
    _id?: string
    name: string
    url: string
    objectName: string
    typ: string
    kategorie?: 'bauplan' | 'lieferschein' | 'aufmass' | 'sicherheit' | 'foto' | 'sonstiges'
    kommentar?: string
    hochgeladenAm: Date
    hochgeladenVon: string
  }>
  
  // Aktivitäten
  aktivitaeten?: Array<{
    aktion: string
    benutzer: string
    zeitpunkt: Date
    details?: string
    typ: 'projekt' | 'angebot' | 'rechnung' | 'dokument' | 'status'
  }>
  
  // Metadaten
  notizen?: string
  erstelltAm: Date
  zuletztGeaendert: Date
  erstelltVon: string
  tags?: string[]
  
  // Kalkulation
  vorkalkulation?: Vorkalkulation
  nachkalkulation?: Nachkalkulation
  
  // Optional: Verlaufsdaten für Charts
  kalkulationsVerlauf?: Array<{
    datum: Date
    istStundenAufbau: number
    istStundenAbbau: number
    istUmsatzGesamt: number
    erfuellungsgrad: number
  }>
}

// Kunde
export interface Kunde {
  _id?: string
  kundennummer?: string
  firma?: string
  anrede?: 'Herr' | 'Frau' | 'Firma'
  vorname?: string
  nachname?: string
  email?: string
  telefon?: string
  mobil?: string
  adresse?: {
    strasse?: string
    hausnummer?: string
    plz?: string
    ort?: string
    land?: string
  }
  // Erweiterte Felder
  kundentyp: 'privat' | 'gewerblich' | 'oeffentlich'
  ansprechpartner?: {
    vorname?: string
    nachname?: string
    position?: string
    telefon?: string
    email?: string
  }
  // KPIs (automatisch berechnet oder gecacht)
  umsatzGesamt?: number
  offenePosten?: number
  anzahlProjekte?: number
  anzahlAngebote?: number
  anzahlRechnungen?: number
  // Kategorisierung für Kundenanalyse
  kategorisierung?: 'A' | 'B' | 'C'
  // Logo & Dokumente
  firmenlogo?: string // MinIO Object Name
  firmenlogoUrl?: string // Presigned URL
  // Notizen & Status
  notizen?: string
  aktiv: boolean
  erstelltAm: Date
  zuletztGeaendert: Date
}

// Kunden-Notiz für Timeline
export interface KundenNotiz {
  _id?: string
  kundeId: string
  titel: string
  inhalt: string
  autor: string
  autorName: string
  erstelltAm: Date
  typ?: 'notiz' | 'telefonat' | 'meeting' | 'email' | 'sonstiges'
}

// Angebot
export interface AngebotPosition {
  _id?: string
  position: string // Geändert von number zu string für Formatierung "01", "02", etc.
  typ: 'material' | 'lohn' | 'miete' | 'transport' | 'sonstiges'
  beschreibung: string // Kann HTML enthalten (Rich-Text)
  menge: number
  einheit: string // Dropdown: "St.", "m", "qm", "lfdm", "stgm", "m³"
  einzelpreis: number
  gesamtpreis: number
  prozentsatz?: number // Optionaler Prozentsatz für prozentuale Abrechnung (z.B. 50 für 50%)
  materialId?: string // Referenz zu Material-Stammdaten
  verknuepftMitPosition?: string // Verknüpfung zu anderer Position (geändert zu string)
  verknuepfungsTyp?: 'basis' | 'abhaengig' // basis = Hauptposition, abhaengig = hängt von anderer Position ab
  verknuepfungsBeschreibung?: string // z.B. "Miete ab 4 Wochen basierend auf Position 1"
  preisTyp?: 'fest' | 'einheitspreis' // NEU: 'einheitspreis' = E.P. (wird später im Projekt berechnet)
  finalerEinzelpreis?: number // NEU: Wird im Projekt gesetzt wenn preisTyp='einheitspreis'
  finalerGesamtpreis?: number // NEU: Wird im Projekt berechnet wenn preisTyp='einheitspreis'
}

// Positions-Vorlage für wiederverwendbare Positionen
export interface PositionsVorlage {
  _id?: string
  shortcode: string // z.B. "EINR", "MIETE4W"
  name: string // z.B. "Einrüstung Standard"
  beschreibung: string
  typ: 'material' | 'lohn' | 'miete' | 'transport' | 'sonstiges'
  einheit: string
  standardPreis?: number
  standardMenge?: number
  standardProzentsatz?: number // Optionaler Standard-Prozentsatz
  kategorie?: string // z.B. "Gerüstbau", "Transport"
  aktiv: boolean
  erstelltAm: Date
  zuletztGeaendert: Date
}

// Einleitungstext-Vorlage für Angebote
export interface EinleitungstextVorlage {
  _id?: string
  name: string // z.B. "Standard Anrede Bauunternehmen"
  text: string // Der eigentliche Einleitungstext
  kategorie?: string // z.B. "Bauunternehmen", "Privatkunde"
  aktiv: boolean
  erstelltAm: Date
  zuletztGeaendert: Date
}

// Zahlungsbedingungen-Vorlage für Angebote
export interface ZahlungsbedingungenVorlage {
  _id?: string
  name: string // z.B. "14 Tage netto"
  text: string // Der eigentliche Text
  kategorie?: string
  aktiv: boolean
  erstelltAm: Date
  zuletztGeaendert: Date
}

// Schlusstext-Vorlage für Angebote
export interface SchlusstextVorlage {
  _id?: string
  name: string // z.B. "Freundliche Grüße"
  text: string // Der eigentliche Schlusstext
  kategorie?: string
  aktiv: boolean
  erstelltAm: Date
  zuletztGeaendert: Date
}

// Betreff-Vorlage für Angebote
export interface BetreffVorlage {
  _id?: string
  name: string // z.B. "Standard Gerüstbau"
  text: string // Der eigentliche Betreff
  kategorie?: string
  aktiv: boolean
  erstelltAm: Date
  zuletztGeaendert: Date
}

export interface Angebot {
  _id?: string
  angebotsnummer: string
  kundeId: string
  kundeName: string
  angebotTyp?: 'dachdecker' | 'maler' | 'bauunternehmen' // Branche/Kundentyp
  kundeAdresse?: string
  datum: Date
  gueltigBis?: Date
  betreff?: string
  anrede?: string
  einleitung?: string
  positionen: AngebotPosition[]
  zwischensumme: number
  rabatt?: number
  rabattProzent?: number
  netto: number
  mwstSatz: number
  mwstBetrag: number
  brutto: number
  zahlungsbedingungen?: string
  lieferbedingungen?: string
  schlusstext?: string
  status: 'entwurf' | 'gesendet' | 'angenommen' | 'abgelehnt' | 'abgelaufen'
  versionsnummer: number
  vorgaengerVersion?: string // Angebots-ID der vorherigen Version
  projektId?: string // Falls aus Angebot ein Projekt wurde
  pdfUrl?: string
  pdfObjectName?: string
  versandtAm?: Date
  versandtAn?: string
  angenommenAm?: Date
  abgelehntAm?: Date
  erstelltAm: Date
  zuletztGeaendert: Date
  erstelltVon: string
}

// Rechnung
export interface Rechnung {
  _id?: string
  rechnungsnummer: string
  angebotId?: string // Referenz zum ursprünglichen Angebot
  projektId?: string
  kundeId: string
  kundeName: string
  kundeAdresse?: string
  rechnungsdatum: Date
  leistungszeitraum?: {
    von: Date
    bis: Date
  }
  typ: 'vollrechnung' | 'teilrechnung' | 'abschlagsrechnung' | 'schlussrechnung'
  positionen: AngebotPosition[]
  zwischensumme: number
  rabatt?: number
  rabattProzent?: number
  netto: number
  mwstSatz: number
  mwstBetrag: number
  brutto: number
  zahlungsziel: number // Tage
  faelligAm: Date
  status: 'entwurf' | 'gesendet' | 'bezahlt' | 'teilbezahlt' | 'ueberfaellig' | 'storniert'
  bezahltAm?: Date
  bezahltBetrag?: number
  mahnstufe: 0 | 1 | 2 | 3
  letzeMahnungAm?: Date
  bankverbindung?: {
    inhaber: string
    iban: string
    bic: string
    bank: string
  }
  pdfUrl?: string
  pdfObjectName?: string
  versandtAm?: Date
  versandtAn?: string
  notizen?: string
  erstelltAm: Date
  zuletztGeaendert: Date
  erstelltVon: string
}

// Mahnung
export interface Mahnung {
  _id?: string
  rechnungId: string
  rechnungsnummer: string
  mahnungsnummer: string
  mahnstufe: 1 | 2 | 3
  datum: Date
  mahngebuehren: number
  verzugszinsen?: number
  offenerBetrag: number
  gesamtforderung: number
  zahlungsziel: number
  faelligAm: Date
  versandtAm?: Date
  pdfUrl?: string
  pdfObjectName?: string
  erstelltAm: Date
  erstelltVon: string
}

// Termin/Kalender
export interface Termin {
  _id?: string
  titel: string
  beschreibung?: string
  start: Date
  ende: Date
  ganztaegig: boolean
  typ: 'einsatz' | 'urlaub' | 'meeting' | 'deadline' | 'faelligkeit' | 'sonstiges'
  projektId?: string
  projektName?: string
  mitarbeiterIds?: string[]
  mitarbeiterNamen?: string[]
  standort?: string
  erinnerung?: {
    aktiv: boolean
    minuten: number // Minuten vor Start
  }
  farbe?: string
  notizen?: string
  erstelltAm: Date
  zuletztGeaendert: Date
  erstelltVon: string
}

// Material-Stammdaten
export interface Material {
  _id?: string
  materialnummer?: string
  name: string
  beschreibung?: string
  kategorie: string
  einheit: string // 'm', 'kg', 'Stk', etc.
  einkaufspreis?: number
  verkaufspreis: number
  lieferant?: string
  lieferantId?: string
  lagerbestand?: number
  mindestbestand?: number
  aktiv: boolean
  erstelltAm: Date
  zuletztGeaendert: Date
}

// Einsatzplanung
export interface Einsatz {
  _id?: string
  projektId: string
  projektName: string
  mitarbeiterId: string
  mitarbeiterName: string
  von: Date
  bis: Date
  rolle?: string
  geplantStunden?: number
  notizen?: string
  bestaetigt: boolean
  erstelltAm: Date
  zuletztGeaendert: Date
}

// ========================================
// ALTE GUTACHTER-SYSTEM TYPEN (behalten für Rückwärtskompatibilität)
// ========================================

export interface Mandant {
  vorname: string
  nachname: string
  telefon?: string
  email?: string
  geburtsdatum?: string
  adresse?: string
  nummer?: string
}

export interface Schaden {
  schadenstyp: string
  schadensschwere: string
  unfallort: string
  unfallzeit: string
  beschreibung: string
}

export interface Partei {
  vorname: string
  nachname: string
  versicherung?: string
  kennzeichen?: string
  beteiligungsposition: string
  kfzModell?: string
  fahrzeughalter?: string
}

export interface Vollmacht {
  dokument: string
  unterschrieben: boolean
  unterschriebenAm?: Date
}

export interface VermitteltVon {
  vorname: string
  nachname: string
  unternehmen: string
  referenzNummer?: string
}

export interface Aufgabe {
  _id?: string
  titel: string
  prioritaet: 'niedrig' | 'mittel' | 'hoch'
  faelligAm: Date
  status: 'offen' | 'in_bearbeitung' | 'erledigt'
  erstelltAm: Date
  zugewiesenAn: string
  beschreibung?: string
}

export interface Dokument {
  _id?: string
  titel?: string
  name?: string
  dateiname: string
  dateipfad: string // MinIO Object Name
  url?: string // Presigned URL
  dateigroesse: number
  dateityp?: string
  mimetype: string
  hochgeladenVon: string
  hochgeladenAm: Date
  kategorie: 'gutachten' | 'attest' | 'fahrzeugschein' | 'fuehrerschein_vorne' | 'fuehrerschein_hinten' | 'personalausweis_vorne' | 'personalausweis_hinten' | 'polizeibericht' | 'arztbericht' | 'versicherungsdaten' | 'kfz_gutachten' | 'rechnungen' | 'unfallbericht' | 'unfall_bilder' | 'rechnung' | 'reparatur' | 'sonstige' | 'vollmacht'
}

export interface Vermittlung {
  _id?: string
  partnerId: string
  referenzNummer: string
  vermitteltAm: Date
  provision?: number
  status: 'aktiv' | 'abgeschlossen'
}

export interface Abrechnung {
  _id?: string
  gutachterId: string
  betrag: number
  status: 'offen' | 'bezahlt' | 'storniert'
  faelligAm: Date
  bezahltAm?: Date
  zahlungsreferenz?: string
}

// NEU: Fall-bezogenes Audit-Log für Änderungsverfolgung
export interface FallAuditLog {
  _id?: string
  fallId: string
  aktion: 'erstellt' | 'bearbeitet' | 'status_geaendert' | 'dokument_hinzugefuegt' | 'aufgabe_erstellt' | 'aufgabe_erledigt' | 'zugewiesen' | 'kommentar_hinzugefuegt'
  durchgefuehrtVon: string // User ID
  durchgefuehrtVonRolle: 'admin' | 'gutachter' | 'partner'
  zeitpunkt: Date
  aenderungen?: {
    feld: string
    altWert: any
    neuWert: any
  }[]
  beschreibung?: string
  ipAdresse?: string
}

export interface Benachrichtigung {
  _id?: string
  empfaengerId: string // User ID
  empfaengerRolle: 'admin' | 'gutachter' | 'partner'
  absenderId: string // User ID
  absenderRolle: 'admin' | 'gutachter' | 'partner'
  typ: 'dokument_hochgeladen' | 'fall_bearbeitet' | 'fall_zugewiesen' | 'aufgabe_faellig' | 'kommentar_hinzugefuegt' | 'status_geaendert' | 'neue_chat_nachricht' | 'nutzer_eingeladen' | 'nutzer_aktiviert' | 'nutzer_gelöscht' | 'nutzer_verifiziert' | 'verifizierung_email_gesendet'
  titel: string
  nachricht: string
  fallId?: string // Referenz zum Fall
  dokumentId?: string // Referenz zum Dokument
  chatMessageId?: string // Referenz zur Chat-Nachricht
  url?: string // Direkte Verlinkung
  gelesen: boolean
  gelesenAm?: Date
  erstelltAm: Date
  metadata?: {
    fallname?: string
    dokumentName?: string
    alterStatus?: string
    neuerStatus?: string
    chatType?: 'fallbezogen' | 'direkt'
    senderName?: string
  }
}

export interface Fall {
  _id?: string
  fallname: string
  status: 'offen' | 'in_bearbeitung' | 'uebermittelt' | 'abgeschlossen'
  mandant: Mandant
  schaden: Schaden
  erstPartei: Partei
  zweitPartei: Partei
  vollmacht: Vollmacht
  vermitteltVon: VermitteltVon
  fahrzeugart: 'pkw' | 'lkw' | 'motorrad' | 'transporter'
  standort: string
  betrag?: number
  erstelltAm: Date
  zuletztGeaendert: Date
  erstelltVon: string // User ID (kann Admin oder Gutachter sein)
  erstelltVonRolle: 'admin' | 'gutachter' | 'partner'
  zugewiesenAn?: string // Gutachter User ID
  aufgaben: Aufgabe[]
  dokumente: Dokument[]
  vermittlungen: Vermittlung[]
  abrechnungen: Abrechnung[]
  notizen?: string
  // NEU: Chat-Cluster für fallbezogene Kommunikation
  chatCluster?: ChatCluster
  // NEU: Synchronisations-Flags
  sichtbarFuerAdmin: boolean // Immer true
  sichtbarFuerGutachter: boolean // true wenn zugewiesenAn gesetzt
  gesperrt?: boolean // Admin kann Fall sperren
  gesperrtVon?: string
  gesperrtAm?: Date
}

// Alte Interface entfernt - siehe unten für aktuelles Interface

// KOMMUNIKATION VORÜBERGEHEND DEAKTIVIERT
// Chat-Nachrichten Interface für fallunabhängige und fallbezogene Kommunikation
export interface ChatMessage {
  _id?: string
  fallId?: string // Optional für fallbezogene Nachrichten
  senderId: string // User ID des Absenders
  senderRole: 'admin' | 'gutachter' | 'partner'
  senderName: string // Vorname Nachname des Absenders
  recipientId: string // User ID des Empfängers (für Direktnachrichten)
  recipientRole: 'admin' | 'gutachter' | 'partner'
  recipientName: string // Vorname Nachname des Empfängers
  content: string // Nachrichteninhalt
  attachments?: ChatAttachment[]
  timestamp: Date
  read: boolean // Ob die Nachricht gelesen wurde
  readAt?: Date
  edited?: boolean // Ob die Nachricht bearbeitet wurde
  editedAt?: Date
  deleted?: boolean // Soft delete für Nachrichten
  deletedAt?: Date
}

// Anhänge für Chat-Nachrichten
export interface ChatAttachment {
  id: string
  name: string
  size: string // Formatiert (z.B. "2.5 MB")
  url: string // URL zum Download
  type: string // MIME-Type
  uploadedAt: Date
}

// KOMMUNIKATION VORÜBERGEHEND DEAKTIVIERT
// Chat-Cluster für fallbezogene Kommunikation (in Fall gespeichert)
export interface ChatCluster {
  fallId: string
  participants: ChatParticipant[]
  messages: ChatMessage[]
  lastMessage?: ChatMessage
  unreadCount: {
    admin: number
    gutachter: number
    partner: number
  }
  createdAt: Date
  updatedAt: Date
}

// KOMMUNIKATION VORÜBERGEHEND DEAKTIVIERT
// Teilnehmer an einem Chat-Cluster
export interface ChatParticipant {
  userId: string
  role: 'admin' | 'gutachter' | 'partner'
  name: string
  joinedAt: Date
  active: boolean // Ob der Teilnehmer noch aktiv ist
}

// KOMMUNIKATION VORÜBERGEHEND DEAKTIVIERT
// Konversation für die ConversationList (aggregierte Daten)
export interface Conversation {
  caseId: string // Fall-ID oder eindeutige Chat-ID für fallunabhängige Chats
  caseName: string // Fallname oder Chat-Name
  participants: ChatParticipant[]
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  status: 'aktiv' | 'archiviert'
  isDirectChat: boolean // true für Direktchats zwischen zwei Personen
  chatType: 'fallbezogen' | 'direkt' // Art des Chats
}

// Legacy User-Typen (altes System mit Gutachter/Partner)
export interface LegacyUser {
  _id?: any
  email: string
  vorname: string
  nachname: string
  rolle: 'admin' | 'gutachter' | 'partner'
  aktiv: boolean
  erstelltAm: Date
  letzterLogin?: Date
  zuletztGeaendert?: Date
  
  // Gutachter-spezifisch
  gutachterNummer?: string
  verifiziert?: boolean
  firma?: string
  adresse?: {
    strasse?: string
    hausnummer?: string
    plz?: string
    ort?: string
    land?: string
  }
  telefon?: string
  profilbildUrl?: string
  profilbildObjectName?: string // MinIO Object Name für Profilbild
  
  // Dienste & Spezialisierungen
  dienste?: string[]
  spezielleExpertise?: string
  zertifikate?: {
    _id?: string
    name: string
    url: string
    objectName?: string
    dateityp?: string
    groesse?: number
    hochgeladenAm: Date
  }[]
  anfahrtsradius?: number
  
  // Social Media
  socialMedia?: {
    instagram?: string
    facebook?: string
    tiktok?: string
    linkedin?: string
    website?: string
  }
  
  // Öffnungszeiten
  oeffnungszeiten?: {
    tag: string
    von: string
    bis: string
    geoeffnet: boolean
  }[]
  termineNachVereinbarung?: boolean
}

// Firmen-Einstellungen für Angebots- und Rechnungsvorlagen
export interface CompanySettings {
  _id?: string
  
  // Firmendaten
  firmenname?: string
  strasse?: string
  plz?: string
  ort?: string
  land?: string
  telefon?: string
  email?: string
  website?: string
  steuernummer?: string
  ustId?: string
  geschaeftsfuehrer?: string
  handelsregister?: string
  amtsgericht?: string
  footerText?: string // Rechtliche Hinweise für Dokument-Footer
  
  // Logos & Zertifikate
  logoUrl?: string
  logoObjectName?: string // MinIO Object Name für primäres Logo
  logoSecondaryUrl?: string
  logoSecondaryObjectName?: string // MinIO Object Name für sekundäres Logo
  zertifikate?: Array<{
    _id?: string
    name: string
    url: string
    objectName: string
    typ: string // z.B. "DIN EN 12811", "SCC", "TÜV"
    hochgeladenAm: Date
  }>
  
  // Bankinformationen
  bankname?: string
  iban?: string
  bic?: string
  zahlungsziel?: number // Tage (z.B. 14, 30)
  verwendungszweck?: string
  istStandardKonto?: boolean
  skontoTage?: number // Tage für Skonto (z.B. 7)
  skontoProzent?: number // Prozent (z.B. 2)
  
  // Template-Auswahl
  offerTemplate?: 'modern' | 'klassisch' | 'kompakt'
  invoiceTemplate?: 'modern' | 'klassisch' | 'kompakt'
  
  // Template-Konfiguration
  templateConfig?: {
    primaryColor?: string // Akzentfarbe für Templates
    fontSize?: 'small' | 'medium' | 'large'
    logoPosition?: 'left' | 'center' | 'right'
    headerHeight?: number // in cm
    footerHeight?: number // in cm
  }
  
  // Kalkulationsparameter
  kalkulationsParameter?: KalkulationsParameter
  
  // Metadaten
  aktiv?: boolean
  erstelltAm?: Date
  zuletztGeaendert?: Date
  geaendertVon?: string
}

// Anfrage-Interface
export interface Anfrage {
  _id?: string
  anfragenummer: string
  kundeId: string
  kundeName: string
  ansprechpartner?: string
  
  // Bauvorhaben
  bauvorhaben: {
    objektname: string
    strasse: string
    plz: string
    ort: string
    besonderheiten?: string
  }
  
  // Art der Arbeiten
  artDerArbeiten: {
    dachdecker: boolean
    fassade: boolean
    daemmung: boolean
    sonstige: boolean
    sonstigeText?: string
  }
  
  // Gerüstseiten
  geruestseiten: {
    vorderseite: boolean
    rueckseite: boolean
    rechteSeite: boolean
    linkeSeite: boolean
    gesamtflaeche?: number
  }
  
  // Zusatzinformationen
  anmerkungen?: string
  dokumente?: Array<{
    _id?: string
    name: string
    url: string
    objectName: string
    typ: string
    hochgeladenAm: Date
  }>
  
  // Status & Verwaltung
  status: 'offen' | 'in_bearbeitung' | 'angebot_in_bearbeitung' | 'angebot_erstellt'
  zustaendig?: string
  angebotId?: string // Verknüpfung zum erstellten Angebot
  projektId?: string // Verknüpfung zum erstellten Projekt
  
  // Aktivitätenprotokoll
  aktivitaeten?: Array<{
    aktion: string
    benutzer: string
    zeitpunkt: Date
    details?: string
  }>
  
  erstelltAm: Date
  zuletztGeaendert: Date
  erstelltVon: string
}

// ============================================================================
// SYSTEM-EINSTELLUNGEN
// ============================================================================

// Benachrichtigungsvorlagen für automatische E-Mails
export interface BenachrichtigungsVorlagen {
  _id?: string
  mandantId?: string
  
  // Willkommensnachricht (bei neuem Benutzer)
  willkommen: {
    betreff: string
    inhalt: string
    aktiv: boolean
  }
  
  // Passwort zurücksetzen
  passwortZuruecksetzen: {
    betreff: string
    inhalt: string
    aktiv: boolean
  }
  
  // Angebot erstellt und versendet
  angebotVersendet: {
    betreff: string
    inhalt: string
    aktiv: boolean
  }
  
  // Rechnung versendet
  rechnungVersendet: {
    betreff: string
    inhalt: string
    aktiv: boolean
  }
  
  // Rechnung als bezahlt markiert
  rechnungBezahlt: {
    betreff: string
    inhalt: string
    aktiv: boolean
  }
  
  // Zahlungserinnerung
  zahlungserinnerung: {
    betreff: string
    inhalt: string
    aktiv: boolean
  }
  
  // Mahnung erstellt (Zahlungsfrist nicht eingehalten)
  mahnungErstellt: {
    betreff: string
    inhalt: string
    aktiv: boolean
  }
  
  erstelltAm: Date
  zuletztGeaendert: Date
}

// ============================================================================
// FINANZEN-MODUL TYPEN
// ============================================================================

export interface FinanzenKategorie {
  _id?: string
  name: string
  typ: 'einnahme' | 'ausgabe'
  farbe?: string
  icon?: string
  beschreibung?: string
  budget?: number
  aktiv: boolean
  sortierung?: number
  erstelltAm: Date
  zuletztGeaendert: Date
}

export interface Transaktion {
  _id?: string
  mandantId?: string
  typ: 'einnahme' | 'ausgabe'
  betrag: number
  kategorie: string
  kategorieId?: string
  beschreibung: string
  datum: Date
  belegnummer?: string
  zahlungsart?: 'bar' | 'ueberweisung' | 'karte' | 'lastschrift' | 'sonstige'
  mwstSatz?: number
  nettoBetrag?: number
  bruttoBetrag?: number
  buchungsdatum?: Date
  wiederkehrend?: boolean
  wiederkehrendId?: string
  dokument?: {
    url: string
    filename: string
    mimeType: string
    groesse: number
  }
  projekt?: {
    id: string
    name: string
  }
  kunde?: {
    id: string
    name: string
  }
  notizen?: string
  tags?: string[]
  status?: 'ausstehend' | 'gebucht' | 'storniert'
  erstelltAm: Date
  zuletztGeaendert: Date
  erstelltVon?: string
}

export interface Budget {
  _id?: string
  mandantId?: string
  kategorieId: string
  kategorieName: string
  limit: number
  zeitraum: 'monat' | 'quartal' | 'jahr'
  jahr: number
  monat?: number // 1-12
  quartal?: number // 1-4
  ausgegeben: number
  prozent: number
  warnschwelle?: number // Prozent (z.B. 80)
  aktiv: boolean
  benachrichtigungen: boolean
  erstelltAm: Date
  zuletztGeaendert: Date
}

export interface KontostandSnapshot {
  _id?: string
  mandantId?: string
  datum: Date
  betrag: number
  typ: 'manuell' | 'automatisch'
  notiz?: string
  erstelltAm: Date
  erstelltVon?: string
}

export interface FinanzenKIBericht {
  _id?: string
  mandantId?: string
  zeitraum: {
    von: Date
    bis: Date
  }
  analyse: {
    einnahmen: number
    ausgaben: number
    bilanz: number
    trends?: string
    empfehlungen?: string
    kategorieAnalyse?: any
  }
  generiert: Date
  erstelltVon?: string
}

// Firmen-/Unternehmenseinstellungen
export interface FirmenEinstellungen {
  _id?: string
  mandantId?: string
  
  // Unternehmensdaten
  firmenname: string
  supportEmail: string
  supportPhone: string
  imprintUrl: string
  privacyUrl: string
  
  // Optional: Logo und weitere Daten
  logo?: {
    primary?: string
    secondary?: string
  }
  
  erstelltAm: Date
  zuletztGeaendert: Date
}
