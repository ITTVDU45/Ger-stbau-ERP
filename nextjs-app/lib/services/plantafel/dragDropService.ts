/**
 * DragDropService
 * 
 * Service für Drag & Drop-Operationen in der Plantafel.
 * Zentrale Logik für Validierung, Payload-Berechnung und Resource-Extraktion.
 */

import { format } from 'date-fns'
import { UNASSIGNED_RESOURCE_ID, DATA_ATTRIBUTES } from './constants'
import type { 
  PlantafelEvent, 
  PlantafelView, 
  UpdatePayload, 
  DropValidationResult,
  DropContext 
} from './types'

/**
 * Validiert, ob ein Drop-Vorgang erlaubt ist
 */
export function validateDrop(
  event: PlantafelEvent,
  targetResourceId: string,
  view: PlantafelView
): DropValidationResult {
  // Urlaub-Events können nicht verschoben werden
  if (event.sourceType === 'urlaub') {
    return {
      valid: false,
      reason: 'Abwesenheiten können nicht verschoben werden'
    }
  }

  // Kein sourceId vorhanden
  if (!event.sourceId) {
    return {
      valid: false,
      reason: 'Keine gültige Einsatz-ID gefunden'
    }
  }

  // targetResourceId muss vorhanden sein (außer UNASSIGNED_RESOURCE_ID)
  if (!targetResourceId && targetResourceId !== UNASSIGNED_RESOURCE_ID) {
    return {
      valid: false,
      reason: 'Kein gültiges Ziel für die Verschiebung'
    }
  }

  return { valid: true }
}

/**
 * Berechnet das Update-Payload für einen Drop-Vorgang
 */
export function calculateUpdates(
  event: PlantafelEvent,
  newDate: Date,
  targetResourceId: string,
  view: PlantafelView
): UpdatePayload {
  const newDateStr = format(newDate, 'yyyy-MM-dd')
  
  // Bestimme ob Aufbau oder Abbau Event
  const isAufbau = event.id.includes('-setup') || !!event.setupDate
  const isAbbau = event.id.includes('-dismantle') || !!event.dismantleDate

  // Basis-Payload mit Datum-Updates
  const payload: UpdatePayload = {
    von: new Date(newDate.setHours(8, 0, 0, 0)).toISOString(),
    bis: new Date(newDate.setHours(17, 0, 0, 0)).toISOString(),
  }

  // Aufbau/Abbau-Datum aktualisieren
  if (isAufbau) {
    payload.setupDate = newDateStr
  }
  if (isAbbau) {
    payload.dismantleDate = newDateStr
  }

  // Resource-Update basierend auf View
  if (targetResourceId) {
    // Normalisiere UNASSIGNED_RESOURCE_ID zu undefined für API
    const normalizedResourceId = targetResourceId === UNASSIGNED_RESOURCE_ID 
      ? undefined 
      : targetResourceId

    if (view === 'team') {
      // Im Team-View: Mitarbeiter aktualisieren
      payload.mitarbeiterId = normalizedResourceId
    } else if (view === 'project') {
      // Im Projekt-View: Projekt aktualisieren
      payload.projektId = normalizedResourceId
    }
  }

  return payload
}

/**
 * Berechnet Updates für Resize-Operationen
 */
export function calculateResizeUpdates(
  event: PlantafelEvent,
  newStart: Date,
  newEnd: Date
): UpdatePayload {
  return {
    von: newStart.toISOString(),
    bis: newEnd.toISOString(),
  }
}

/**
 * Extrahiert die Resource-ID aus einem Drop-Event
 * Sucht nach dem nächsten Element mit data-resource-id Attribut
 */
export function extractResourceIdFromDrop(e: React.DragEvent): string | null {
  const target = e.target as HTMLElement
  
  // Suche nach dem nächsten Element mit data-resource-id
  const cell = target.closest(`[${DATA_ATTRIBUTES.resourceId}]`)
  if (cell) {
    return cell.getAttribute(DATA_ATTRIBUTES.resourceId)
  }

  // Fallback: Suche in Parent-Elementen
  let parent = target.parentElement
  while (parent) {
    const resourceId = parent.getAttribute(DATA_ATTRIBUTES.resourceId)
    if (resourceId !== null) {
      return resourceId
    }
    parent = parent.parentElement
  }

  return null
}

/**
 * Extrahiert das Datum aus einem Drop-Event
 * Sucht nach dem nächsten Element mit data-date Attribut
 */
export function extractDateFromDrop(e: React.DragEvent): Date | null {
  const target = e.target as HTMLElement
  
  // Suche nach dem nächsten Element mit data-date
  const cell = target.closest(`[${DATA_ATTRIBUTES.date}]`)
  if (cell) {
    const dateStr = cell.getAttribute(DATA_ATTRIBUTES.date)
    if (dateStr) {
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
    }
  }

  return null
}

/**
 * Prüft, ob sich die Resource geändert hat
 */
export function hasResourceChanged(
  event: PlantafelEvent,
  targetResourceId: string,
  view: PlantafelView
): boolean {
  const currentResourceId = view === 'team' 
    ? (event.mitarbeiterId || UNASSIGNED_RESOURCE_ID)
    : (event.projektId || '')

  return currentResourceId !== targetResourceId
}

/**
 * Erstellt einen vollständigen Drop-Context
 */
export function createDropContext(
  event: PlantafelEvent,
  targetResourceId: string,
  targetDate: Date,
  view: PlantafelView
): DropContext {
  return {
    event,
    targetResourceId,
    targetDate,
    view,
  }
}

// Export als Service-Objekt für einfachen Import
export const dragDropService = {
  validateDrop,
  calculateUpdates,
  calculateResizeUpdates,
  extractResourceIdFromDrop,
  extractDateFromDrop,
  hasResourceChanged,
  createDropContext,
}

export default dragDropService
