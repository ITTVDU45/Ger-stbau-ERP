/**
 * Plantafel Service Constants
 * 
 * Zentrale Konstanten für den Plantafel-Service-Layer.
 * Diese Konstanten werden in allen Services und Komponenten verwendet.
 */

/**
 * Spezielle Resource-ID für nicht zugewiesene Einsätze.
 * Wird verwendet, wenn ein Einsatz keinem Mitarbeiter zugewiesen ist.
 */
export const UNASSIGNED_RESOURCE_ID = '__unassigned__'

/**
 * Titel für nicht zugewiesene Resources
 */
export const UNASSIGNED_RESOURCE_TITLE = '⚠️ Nicht zugewiesen'

/**
 * Standard-Arbeitszeiten
 */
export const DEFAULT_WORK_START_HOUR = 8
export const DEFAULT_WORK_END_HOUR = 17

/**
 * Farben für Event-Typen
 */
export const EVENT_COLORS = {
  aufbau: '#3b82f6',     // Blau
  abbau: '#22c55e',      // Grün
  einsatz: '#6366f1',    // Indigo
  urlaub: '#f59e0b',     // Amber
  krankheit: '#ef4444',  // Rot
  sonderurlaub: '#8b5cf6', // Violett
  unbezahlt: '#6b7280',  // Grau
  sonstiges: '#f97316',  // Orange
} as const

/**
 * Data-Attribute für DOM-Elemente
 */
export const DATA_ATTRIBUTES = {
  resourceId: 'data-resource-id',
  eventId: 'data-event-id',
  date: 'data-date',
} as const
