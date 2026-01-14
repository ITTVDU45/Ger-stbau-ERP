/**
 * TypeScript Types für die Plantafel (Ressourcen-Kalender)
 * 
 * Diese Types definieren das Mapping zwischen DB-Entitäten (Einsatz, Urlaub)
 * und React Big Calendar Events/Resources.
 */

import { Einsatz, Urlaub, Mitarbeiter, Projekt } from '@/lib/db/types'

// ============================================================================
// VIEW & FILTER TYPES
// ============================================================================

/** Plantafel-Ansicht: Team (Zeilen=Mitarbeiter) oder Projekt (Zeilen=Projekte) */
export type PlantafelView = 'team' | 'project'

/** Event-Typ für die Plantafel */
export type PlantafelEventType = 'einsatz' | 'urlaub' | 'krankheit' | 'sonderurlaub' | 'unbezahlt' | 'sonstiges'

/** Filter-Optionen für die Plantafel */
export interface PlantafelFilters {
  employeeIds: string[]
  projectIds: string[]
  showAbsences: boolean
  eventTypes: PlantafelEventType[]
}

/** Zeitraum für Abfragen */
export interface DateRange {
  start: Date
  end: Date
}

// ============================================================================
// CALENDAR EVENT & RESOURCE TYPES
// ============================================================================

/**
 * Plantafel-Event: Mapping von Einsatz/Urlaub auf React Big Calendar Event
 * 
 * React Big Calendar erwartet: { id, title, start, end, resourceId, ... }
 */
export interface PlantafelEvent {
  id: string
  title: string
  start: Date
  end: Date
  resourceId: string // mitarbeiterId (Team-View) oder projektId (Projekt-View)

  // Zusätzliche Metadaten
  type: PlantafelEventType
  sourceType: 'einsatz' | 'urlaub' // Woher stammt das Event?
  sourceId: string // Original-ID in der DB

  // Für Einsätze
  mitarbeiterId?: string
  mitarbeiterName?: string
  projektId?: string
  projektName?: string

  // Für Urlaub/Abwesenheit
  urlaubTyp?: 'urlaub' | 'krankheit' | 'sonderurlaub' | 'unbezahlt' | 'sonstiges'

  // Styling
  color?: string // Projektfarbe oder Abwesenheits-Farbe
  hasConflict?: boolean // Konflikt erkannt?
  conflictReason?: string // Grund für Konflikt

  // Zusätzliche Infos
  notes?: string
  bestaetigt?: boolean
  rolle?: string

  // NEU: Simplified Aufbau/Abbau (date-only)
  setupDate?: string      // Aufbau-Datum (YYYY-MM-DD)
  dismantleDate?: string  // Abbau-Datum (YYYY-MM-DD)

  // LEGACY: Aufbau/Abbau-Planung (für Abwärtskompatibilität)
  aufbauVon?: Date
  aufbauBis?: Date
  stundenAufbau?: number
  abbauVon?: Date
  abbauBis?: Date
  stundenAbbau?: number
}

/**
 * Plantafel-Ressource: Mitarbeiter oder Projekt als Zeile im Kalender
 */
export interface PlantafelResource {
  resourceId: string
  resourceTitle: string
  
  // Zusätzliche Infos für Header
  type: 'employee' | 'project'
  
  // Für Mitarbeiter
  vorname?: string
  nachname?: string
  rolle?: string
  aktiv?: boolean
  profilbildUrl?: string
  
  // Für Projekte
  projektname?: string
  kundeName?: string
  status?: string
  
  // Verfügbarkeits-Info (wird berechnet)
  availability?: {
    available: boolean
    reason?: 'booked' | 'vacation' | 'sick' | 'conflict' | 'inactive'
    details?: string
  }
}

// ============================================================================
// CONFLICT TYPES
// ============================================================================

/**
 * Konflikt-Information: Wenn ein Mitarbeiter doppelt verplant ist
 */
export interface ConflictInfo {
  id: string
  mitarbeiterId: string
  mitarbeiterName: string
  
  // Überlappende Events
  event1: {
    id: string
    title: string
    type: PlantafelEventType
    start: Date
    end: Date
  }
  event2: {
    id: string
    title: string
    type: PlantafelEventType
    start: Date
    end: Date
  }
  
  // Konflikt-Typ
  conflictType: 'double_booking' | 'work_during_absence'
  severity: 'warning' | 'error' // warning = geplant vs geplant, error = bestätigt vs bestätigt
  
  // Überlappungs-Zeitraum
  overlapStart: Date
  overlapEnd: Date
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/** GET /api/plantafel/assignments Query-Parameter */
export interface AssignmentsQueryParams {
  from: string // ISO-Datum
  to: string // ISO-Datum
  view?: PlantafelView
  employeeIds?: string // Komma-getrennte IDs
  projectIds?: string // Komma-getrennte IDs
  showAbsences?: 'true' | 'false'
}

/** GET /api/plantafel/assignments Response */
export interface AssignmentsResponse {
  erfolg: boolean
  events: PlantafelEvent[]
  resources: PlantafelResource[]
  conflicts: ConflictInfo[]
  meta: {
    from: string
    to: string
    totalEvents: number
    totalConflicts: number
  }
}

/** POST /api/plantafel/assignments Request Body */
export interface CreateAssignmentRequest {
  mitarbeiterId: string
  projektId: string
  von: string // ISO-Datum
  bis: string // ISO-Datum
  rolle?: string
  geplantStunden?: number
  notizen?: string
  bestaetigt?: boolean
  // Aufbau/Abbau-Planung (optional)
  aufbauVon?: string // ISO-Datum
  aufbauBis?: string // ISO-Datum (optional)
  stundenAufbau?: number
  abbauVon?: string  // ISO-Datum (optional)
  abbauBis?: string  // ISO-Datum (optional)
  stundenAbbau?: number
}

/** PATCH /api/plantafel/assignments/[id] Request Body */
export interface UpdateAssignmentRequest {
  mitarbeiterId?: string
  projektId?: string
  von?: string // ISO-Datum
  bis?: string // ISO-Datum
  rolle?: string
  geplantStunden?: number
  notizen?: string
  bestaetigt?: boolean
  // Aufbau/Abbau-Planung (optional)
  aufbauVon?: string // ISO-Datum
  aufbauBis?: string // ISO-Datum (optional)
  stundenAufbau?: number
  abbauVon?: string  // ISO-Datum (optional)
  abbauBis?: string  // ISO-Datum (optional)
  stundenAbbau?: number
}

/** GET /api/plantafel/conflicts Response */
export interface ConflictsResponse {
  erfolg: boolean
  conflicts: ConflictInfo[]
  meta: {
    from: string
    to: string
    totalConflicts: number
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Mappt einen Einsatz auf ein PlantafelEvent (Legacy - für Abwärtskompatibilität)
 */
export function mapEinsatzToEvent(einsatz: Einsatz, view: PlantafelView): PlantafelEvent {
  return {
    id: `einsatz-${einsatz._id}`,
    title: view === 'team' ? einsatz.projektName : einsatz.mitarbeiterName,
    start: new Date(einsatz.von),
    end: new Date(einsatz.bis),
    resourceId: view === 'team' ? einsatz.mitarbeiterId : einsatz.projektId,
    
    type: 'einsatz',
    sourceType: 'einsatz',
    sourceId: einsatz._id || '',
    
    mitarbeiterId: einsatz.mitarbeiterId,
    mitarbeiterName: einsatz.mitarbeiterName,
    projektId: einsatz.projektId,
    projektName: einsatz.projektName,
    
    notes: einsatz.notizen,
    bestaetigt: einsatz.bestaetigt,
    rolle: einsatz.rolle,
    hasConflict: false,
    
    // Aufbau/Abbau-Planung
    aufbauVon: einsatz.aufbauVon ? new Date(einsatz.aufbauVon) : undefined,
    aufbauBis: einsatz.aufbauBis ? new Date(einsatz.aufbauBis) : undefined,
    stundenAufbau: einsatz.stundenAufbau,
    abbauVon: einsatz.abbauVon ? new Date(einsatz.abbauVon) : undefined,
    abbauBis: einsatz.abbauBis ? new Date(einsatz.abbauBis) : undefined,
    stundenAbbau: einsatz.stundenAbbau
  }
}

/**
 * Mappt einen Einsatz auf mehrere PlantafelEvents (Aufbau + Abbau separat)
 * Wenn Aufbau und Abbau an verschiedenen Tagen sind, werden 2 Events erstellt
 */
export function mapEinsatzToEvents(einsatz: Einsatz, view: PlantafelView): PlantafelEvent[] {
  const events: PlantafelEvent[] = []
  
  // Titel-Logik (UMGEDREHT nach Kundenwunsch):
  // - Team-View: Zeilen = Mitarbeiter → Events zeigen MITARBEITER-Namen
  // - Projekt-View: Zeilen = Projekte → Events zeigen PROJEKT-Namen
  const baseTitle = view === 'team'
    ? (einsatz.mitarbeiterId && einsatz.mitarbeiterName !== 'Nicht zugewiesen')
      ? einsatz.mitarbeiterName
      : 'Nicht zugewiesen'
    : einsatz.projektName
  const resourceId = view === 'team' ? einsatz.mitarbeiterId : einsatz.projektId

  const baseEvent = {
    type: 'einsatz' as PlantafelEventType,
    sourceType: 'einsatz' as const,
    sourceId: einsatz._id || '',
    mitarbeiterId: einsatz.mitarbeiterId,
    mitarbeiterName: einsatz.mitarbeiterName,
    projektId: einsatz.projektId,
    projektName: einsatz.projektName,
    notes: einsatz.notizen,
    bestaetigt: einsatz.bestaetigt,
    rolle: einsatz.rolle,
    hasConflict: false,
    // NEU: Simplified date-only Felder
    setupDate: einsatz.setupDate,
    dismantleDate: einsatz.dismantleDate,
    // LEGACY: Alte Felder für Abwärtskompatibilität
    aufbauVon: einsatz.aufbauVon ? new Date(einsatz.aufbauVon) : undefined,
    aufbauBis: einsatz.aufbauBis ? new Date(einsatz.aufbauBis) : undefined,
    stundenAufbau: einsatz.stundenAufbau,
    abbauVon: einsatz.abbauVon ? new Date(einsatz.abbauVon) : undefined,
    abbauBis: einsatz.abbauBis ? new Date(einsatz.abbauBis) : undefined,
    stundenAbbau: einsatz.stundenAbbau
  }

  // NEU: Prüfe zuerst simplified setup/dismantle
  if (einsatz.setupDate || einsatz.dismantleDate) {
    // Nutze neue date-only Logik
    if (einsatz.setupDate) {
      const setupStart = new Date(einsatz.setupDate + 'T00:00:00.000Z')
      const setupEnd = new Date(einsatz.setupDate + 'T23:59:59.999Z')
      
      events.push({
        ...baseEvent,
        id: `einsatz-${einsatz._id}-setup`,
        title: `${baseTitle} (Aufbau)`,
        start: setupStart,
        end: setupEnd,
        resourceId,
        color: '#3b82f6' // Blau für Aufbau
      })
    }
    
    if (einsatz.dismantleDate) {
      const dismantleStart = new Date(einsatz.dismantleDate + 'T00:00:00.000Z')
      const dismantleEnd = new Date(einsatz.dismantleDate + 'T23:59:59.999Z')
      
      events.push({
        ...baseEvent,
        id: `einsatz-${einsatz._id}-dismantle`,
        title: `${baseTitle} (Abbau)`,
        start: dismantleStart,
        end: dismantleEnd,
        resourceId,
        color: '#22c55e' // Grün für Abbau
      })
    }
    
    return events
  }

  // LEGACY: Alte Logik für Aufbau/Abbau mit Uhrzeiten (Abwärtskompatibilität)
  if (einsatz.aufbauVon && einsatz.stundenAufbau && einsatz.stundenAufbau > 0) {
    const aufbauStart = new Date(einsatz.aufbauVon)
    const aufbauEnd = einsatz.aufbauBis ? new Date(einsatz.aufbauBis) : new Date(einsatz.aufbauVon)

    events.push({
      ...baseEvent,
      id: `einsatz-${einsatz._id}-aufbau`,
      title: `${baseTitle} (Aufbau)`,
      start: aufbauStart,
      end: aufbauEnd,
      resourceId,
      color: '#3b82f6'
    })
  }

  if (einsatz.abbauVon && einsatz.stundenAbbau && einsatz.stundenAbbau > 0) {
    const abbauStart = new Date(einsatz.abbauVon)
    const abbauEnd = einsatz.abbauBis ? new Date(einsatz.abbauBis) : new Date(einsatz.abbauVon)

    events.push({
      ...baseEvent,
      id: `einsatz-${einsatz._id}-abbau`,
      title: `${baseTitle} (Abbau)`,
      start: abbauStart,
      end: abbauEnd,
      resourceId,
      color: '#22c55e'
    })
  }

  // Fallback: Wenn keine Aufbau/Abbau-Daten, nutze Gesamt-Zeitraum
  if (events.length === 0) {
    events.push({
      ...baseEvent,
      id: `einsatz-${einsatz._id}`,
      title: baseTitle,
      start: new Date(einsatz.von),
      end: new Date(einsatz.bis),
      resourceId
    })
  }

  return events
}

/**
 * Mappt einen Urlaub auf ein PlantafelEvent
 */
export function mapUrlaubToEvent(urlaub: Urlaub): PlantafelEvent {
  const typeMap: Record<string, PlantafelEventType> = {
    'urlaub': 'urlaub',
    'krankheit': 'krankheit',
    'sonderurlaub': 'sonderurlaub',
    'unbezahlt': 'unbezahlt',
    'sonstiges': 'sonstiges'
  }
  
  const titleMap: Record<string, string> = {
    'urlaub': '🏖️ Urlaub',
    'krankheit': '🤒 Krank',
    'sonderurlaub': '📋 Sonderurlaub',
    'unbezahlt': '⏸️ Unbezahlt',
    'sonstiges': '📌 Abwesend'
  }
  
  const colorMap: Record<string, string> = {
    'urlaub': '#fb923c', // orange-400 - Orange für Urlaub
    'krankheit': '#ef4444', // red-500 - Rot für Krankheit
    'sonderurlaub': '#a78bfa', // violet-400 - Violett für Sonderurlaub
    'unbezahlt': '#fbbf24', // amber-400 - Gelb für unbezahlt
    'sonstiges': '#94a3b8' // slate-400 - Grau für Sonstiges
  }
  
  // Titel mit Mitarbeitername und Typ
  const typLabel = titleMap[urlaub.typ] || 'Abwesend'
  const title = urlaub.mitarbeiterName 
    ? `${urlaub.mitarbeiterName} (${typLabel})`
    : typLabel
  
  // Parse Datum - kann String oder Date sein
  const parseDate = (dateValue: any): Date => {
    if (dateValue instanceof Date) {
      return dateValue
    }
    if (typeof dateValue === 'string') {
      // Wenn nur Datum (YYYY-MM-DD), füge Zeit hinzu für korrektes Parsing
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return new Date(`${dateValue}T00:00:00.000Z`)
      }
      return new Date(dateValue)
    }
    return new Date()
  }
  
  const startDate = parseDate(urlaub.von)
  const endDate = parseDate(urlaub.bis)
  // Für Ganztags-Events: Ende auf 23:59:59 setzen
  endDate.setHours(23, 59, 59, 999)
  
  return {
    id: `urlaub-${urlaub._id}`,
    title,
    start: startDate,
    end: endDate,
    resourceId: urlaub.mitarbeiterId,
    
    type: typeMap[urlaub.typ] || 'sonstiges',
    sourceType: 'urlaub',
    sourceId: urlaub._id || '',
    
    mitarbeiterId: urlaub.mitarbeiterId,
    mitarbeiterName: urlaub.mitarbeiterName,
    
    urlaubTyp: urlaub.typ,
    color: colorMap[urlaub.typ] || '#94a3b8',
    
    notes: urlaub.grund,
    hasConflict: false
  }
}

/**
 * Mappt einen Mitarbeiter auf eine PlantafelResource
 */
export function mapMitarbeiterToResource(mitarbeiter: Mitarbeiter): PlantafelResource {
  return {
    resourceId: mitarbeiter._id || '',
    resourceTitle: `${mitarbeiter.vorname} ${mitarbeiter.nachname}`,
    type: 'employee',
    vorname: mitarbeiter.vorname,
    nachname: mitarbeiter.nachname,
    aktiv: mitarbeiter.aktiv,
    profilbildUrl: mitarbeiter.profilbildUrl
  }
}

/**
 * Mappt ein Projekt auf eine PlantafelResource
 */
export function mapProjektToResource(projekt: Projekt): PlantafelResource {
  return {
    resourceId: projekt._id || '',
    resourceTitle: projekt.projektname,
    type: 'project',
    projektname: projekt.projektname,
    kundeName: projekt.kundeName,
    status: projekt.status
  }
}

/**
 * Prüft ob zwei Zeiträume überlappen
 */
export function checkOverlap(
  start1: Date, end1: Date,
  start2: Date, end2: Date
): boolean {
  return start1 < end2 && start2 < end1
}

/**
 * Berechnet den Überlappungs-Zeitraum
 */
export function getOverlapPeriod(
  start1: Date, end1: Date,
  start2: Date, end2: Date
): { start: Date, end: Date } | null {
  if (!checkOverlap(start1, end1, start2, end2)) {
    return null
  }
  
  return {
    start: new Date(Math.max(start1.getTime(), start2.getTime())),
    end: new Date(Math.min(end1.getTime(), end2.getTime()))
  }
}

/**
 * Berechnet die Verfügbarkeit eines Mitarbeiters für einen Zeitraum
 */
export function getEmployeeAvailability(
  mitarbeiterId: string,
  events: PlantafelEvent[],
  range: DateRange
): PlantafelResource['availability'] {
  const employeeEvents = events.filter(e => e.mitarbeiterId === mitarbeiterId)
  
  // Prüfe auf Abwesenheit
  const absence = employeeEvents.find(e => 
    e.sourceType === 'urlaub' && 
    checkOverlap(e.start, e.end, range.start, range.end)
  )
  
  if (absence) {
    const reasonMap: Record<string, 'vacation' | 'sick'> = {
      'urlaub': 'vacation',
      'sonderurlaub': 'vacation',
      'krankheit': 'sick'
    }
    return {
      available: false,
      reason: reasonMap[absence.urlaubTyp || ''] || 'vacation',
      details: absence.title
    }
  }
  
  // Prüfe auf Konflikte
  const conflicts = employeeEvents.filter(e => e.hasConflict)
  if (conflicts.length > 0) {
    return {
      available: false,
      reason: 'conflict',
      details: `${conflicts.length} Konflikt(e)`
    }
  }
  
  // Prüfe auf Buchungen
  const bookings = employeeEvents.filter(e => 
    e.sourceType === 'einsatz' && 
    checkOverlap(e.start, e.end, range.start, range.end)
  )
  
  if (bookings.length > 0) {
    return {
      available: false,
      reason: 'booked',
      details: `${bookings.length} Einsatz/Einsätze`
    }
  }
  
  return { available: true }
}
