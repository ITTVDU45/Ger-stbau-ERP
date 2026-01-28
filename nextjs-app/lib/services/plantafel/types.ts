/**
 * Plantafel Service Types
 * 
 * Typen für den Plantafel-Service-Layer.
 * Re-exportiert relevante Typen aus der Komponenten-Ebene
 * und definiert Service-spezifische Typen.
 */

import { Einsatz } from '@/lib/db/types'

// Re-export von Komponenten-Typen
export type {
  PlantafelView,
  PlantafelEvent,
  PlantafelEventType,
  PlantafelResource,
  PlantafelFilters,
  DateRange,
  ConflictInfo,
} from '@/components/plantafel/types'

/**
 * Update-Payload für Einsatz-Updates
 */
export interface UpdatePayload {
  von?: string
  bis?: string
  mitarbeiterId?: string
  projektId?: string
  setupDate?: string
  dismantleDate?: string
  notizen?: string
  bestaetigt?: boolean
  rolle?: string
}

/**
 * Drop-Validierungs-Ergebnis
 */
export interface DropValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Drop-Context für DragDrop-Operationen
 */
export interface DropContext {
  event: import('@/components/plantafel/types').PlantafelEvent
  targetResourceId: string
  targetDate: Date
  view: import('@/components/plantafel/types').PlantafelView
}

/**
 * Resource-Erstellungs-Optionen
 */
export interface ResourceOptions {
  includeUnassigned?: boolean
  onlyActive?: boolean
}

/**
 * Event-Mapping-Optionen
 */
export interface EventMappingOptions {
  includeAllDay?: boolean
  includeGrouping?: boolean
}

/**
 * Einsatz mit serialisierter ID (für API-Responses)
 */
export interface SerializedEinsatz extends Omit<Einsatz, '_id' | 'von' | 'bis'> {
  _id?: string
  von: string | Date
  bis: string | Date
}
