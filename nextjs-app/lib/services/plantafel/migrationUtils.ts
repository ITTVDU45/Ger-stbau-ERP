/**
 * Migration Utilities
 * 
 * Utility-Funktionen für die Migration zwischen alten und neuen
 * resourceId-Formaten. Ermöglicht Rückwärtskompatibilität.
 */

import { UNASSIGNED_RESOURCE_ID } from './constants'

/**
 * Migriert eine alte resourceId zum neuen Format
 * Leere Werte werden zu UNASSIGNED_RESOURCE_ID
 */
export function migrateResourceId(oldId: string | undefined | null): string {
  if (!oldId || oldId === '') {
    return UNASSIGNED_RESOURCE_ID
  }
  return oldId
}

/**
 * Konvertiert eine neue resourceId zurück zum Legacy-Format
 * UNASSIGNED_RESOURCE_ID wird zu undefined
 */
export function legacyResourceId(newId: string): string | undefined {
  if (newId === UNASSIGNED_RESOURCE_ID) {
    return undefined
  }
  return newId
}

/**
 * Migriert einen Einsatz-Datensatz zum neuen Format
 */
export function migrateEinsatz<T extends { mitarbeiterId?: string; projektId?: string }>(
  einsatz: T
): T {
  return {
    ...einsatz,
    // mitarbeiterId bleibt undefined für "nicht zugewiesen" (API-Kompatibilität)
    // projektId bleibt undefined für "kein Projekt"
  }
}

/**
 * Prüft, ob eine resourceId im Legacy-Format ist (leer oder undefined)
 */
export function isLegacyFormat(resourceId: string | undefined | null): boolean {
  return resourceId === undefined || resourceId === null || resourceId === ''
}

/**
 * Prüft, ob eine resourceId im neuen Format ist
 */
export function isNewFormat(resourceId: string): boolean {
  return resourceId === UNASSIGNED_RESOURCE_ID || 
         (resourceId.length === 24 && /^[a-f0-9]+$/.test(resourceId)) // MongoDB ObjectId
}

/**
 * Normalisiert eine resourceId für konsistente Verarbeitung
 */
export function normalizeForComparison(
  resourceId: string | undefined | null
): string {
  if (!resourceId || resourceId === '' || resourceId === UNASSIGNED_RESOURCE_ID) {
    return UNASSIGNED_RESOURCE_ID
  }
  return resourceId
}

/**
 * Vergleicht zwei resourceIds unter Berücksichtigung von Legacy-Formaten
 */
export function resourceIdsEqual(
  id1: string | undefined | null,
  id2: string | undefined | null
): boolean {
  const normalized1 = normalizeForComparison(id1)
  const normalized2 = normalizeForComparison(id2)
  return normalized1 === normalized2
}

// Export als Objekt
export const migrationUtils = {
  migrateResourceId,
  legacyResourceId,
  migrateEinsatz,
  isLegacyFormat,
  isNewFormat,
  normalizeForComparison,
  resourceIdsEqual,
}

export default migrationUtils
