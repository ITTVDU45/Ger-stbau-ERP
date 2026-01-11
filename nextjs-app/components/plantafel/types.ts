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
  
  // Aufbau/Abbau-Zeiten (für Zeiterfassung-Sync)
  aufbauVon?: string
  aufbauBis?: string
  abbauVon?: string
  abbauBis?: string
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
  // Aufbau/Abbau-Zeiten (optional)
  aufbauVon?: string // z.B. "06:00"
  aufbauBis?: string // z.B. "08:00"
  abbauVon?: string  // z.B. "16:00"
  abbauBis?: string  // z.B. "18:00"
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
  // Aufbau/Abbau-Zeiten (optional)
  aufbauVon?: string // z.B. "06:00"
  aufbauBis?: string // z.B. "08:00"
  abbauVon?: string  // z.B. "16:00"
  abbauBis?: string  // z.B. "18:00"
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
 * Mappt einen Einsatz auf ein PlantafelEvent
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
    
    // Aufbau/Abbau-Zeiten
    aufbauVon: einsatz.aufbauVon,
    aufbauBis: einsatz.aufbauBis,
    abbauVon: einsatz.abbauVon,
    abbauBis: einsatz.abbauBis
  }
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
    'urlaub': '#94a3b8', // slate-400
    'krankheit': '#f87171', // red-400
    'sonderurlaub': '#a78bfa', // violet-400
    'unbezahlt': '#fbbf24', // amber-400
    'sonstiges': '#9ca3af' // gray-400
  }
  
  return {
    id: `urlaub-${urlaub._id}`,
    title: titleMap[urlaub.typ] || 'Abwesend',
    start: new Date(urlaub.von),
    end: new Date(urlaub.bis),
    resourceId: urlaub.mitarbeiterId,
    
    type: typeMap[urlaub.typ] || 'sonstiges',
    sourceType: 'urlaub',
    sourceId: urlaub._id || '',
    
    mitarbeiterId: urlaub.mitarbeiterId,
    mitarbeiterName: urlaub.mitarbeiterName,
    
    urlaubTyp: urlaub.typ,
    color: colorMap[urlaub.typ] || '#9ca3af',
    
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
