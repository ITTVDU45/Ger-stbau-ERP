/**
 * Plantafel Service Layer
 * 
 * Zentrale Export-Datei für alle Plantafel-Services.
 * Importiere von hier für einfachen Zugriff auf alle Services.
 * 
 * @example
 * import { dragDropService, eventMappingService, resourceService } from '@/lib/services/plantafel'
 * import { UNASSIGNED_RESOURCE_ID } from '@/lib/services/plantafel'
 */

// Services
export { dragDropService, default as DragDropService } from './dragDropService'
export { eventMappingService, default as EventMappingService } from './eventMappingService'
export { resourceService, default as ResourceService } from './resourceService'
export { migrationUtils, default as MigrationUtils } from './migrationUtils'

// Einzelne Funktionen für direkten Import
export {
  validateDrop,
  calculateUpdates,
  calculateResizeUpdates,
  extractResourceIdFromDrop,
  extractDateFromDrop,
  hasResourceChanged,
  createDropContext,
} from './dragDropService'

export {
  getResourceId,
  getEventTitle,
  mapEinsatzToEvents,
  eventBelongsToResource,
  filterEventsByResource,
  eventInDateRange,
} from './eventMappingService'

export {
  getUnassignedResource,
  isUnassignedResource,
  normalizeResourceId,
  toApiResourceId,
  findResourceById,
  hasResource,
  addUnassignedResource,
  filterResources,
  sortResources,
  createResourceIdSet,
  eventBelongsToResources,
  getResourceDisplayName,
} from './resourceService'

export {
  migrateResourceId,
  legacyResourceId,
  migrateEinsatz,
  isLegacyFormat,
  isNewFormat,
  normalizeForComparison,
  resourceIdsEqual,
} from './migrationUtils'

// Konstanten
export {
  UNASSIGNED_RESOURCE_ID,
  UNASSIGNED_RESOURCE_TITLE,
  DEFAULT_WORK_START_HOUR,
  DEFAULT_WORK_END_HOUR,
  EVENT_COLORS,
  DATA_ATTRIBUTES,
} from './constants'

// Types
export type {
  PlantafelView,
  PlantafelEvent,
  PlantafelEventType,
  PlantafelResource,
  PlantafelFilters,
  DateRange,
  ConflictInfo,
  UpdatePayload,
  DropValidationResult,
  DropContext,
  ResourceOptions,
  EventMappingOptions,
  SerializedEinsatz,
} from './types'
