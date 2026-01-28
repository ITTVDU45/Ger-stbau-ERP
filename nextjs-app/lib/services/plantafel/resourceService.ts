/**
 * ResourceService
 * 
 * Service für Resource-Management in der Plantafel.
 * Zentrale Logik für das Laden und Verwalten von Resources (Mitarbeiter/Projekte).
 */

import { UNASSIGNED_RESOURCE_ID, UNASSIGNED_RESOURCE_TITLE } from './constants'
import type { 
  PlantafelResource, 
  PlantafelView, 
  PlantafelFilters,
  ResourceOptions 
} from './types'

/**
 * Erstellt die "Nicht zugewiesen"-Resource für den Team-View
 */
export function getUnassignedResource(): PlantafelResource {
  return {
    resourceId: UNASSIGNED_RESOURCE_ID,
    resourceTitle: UNASSIGNED_RESOURCE_TITLE,
    type: 'employee',
    aktiv: true,
    vorname: 'Nicht',
    nachname: 'zugewiesen',
  }
}

/**
 * Prüft, ob eine resourceId die "Nicht zugewiesen"-Resource repräsentiert
 */
export function isUnassignedResource(resourceId: string | undefined | null): boolean {
  return !resourceId || resourceId === '' || resourceId === UNASSIGNED_RESOURCE_ID
}

/**
 * Normalisiert eine resourceId zu UNASSIGNED_RESOURCE_ID wenn leer
 */
export function normalizeResourceId(resourceId: string | undefined | null): string {
  if (isUnassignedResource(resourceId)) {
    return UNASSIGNED_RESOURCE_ID
  }
  return resourceId as string
}

/**
 * Konvertiert eine resourceId zurück zum API-Format
 * UNASSIGNED_RESOURCE_ID wird zu undefined für die API
 */
export function toApiResourceId(resourceId: string): string | undefined {
  if (resourceId === UNASSIGNED_RESOURCE_ID) {
    return undefined
  }
  return resourceId
}

/**
 * Findet eine Resource anhand der ID
 */
export function findResourceById(
  resourceId: string,
  resources: PlantafelResource[]
): PlantafelResource | null {
  return resources.find(r => r.resourceId === resourceId) || null
}

/**
 * Prüft, ob eine Resource in der Liste vorhanden ist
 */
export function hasResource(
  resourceId: string,
  resources: PlantafelResource[]
): boolean {
  // UNASSIGNED_RESOURCE_ID ist immer gültig im Team-View
  if (resourceId === UNASSIGNED_RESOURCE_ID) {
    return true
  }
  return resources.some(r => r.resourceId === resourceId)
}

/**
 * Fügt die "Nicht zugewiesen"-Resource zu einer Resource-Liste hinzu
 * (nur wenn noch nicht vorhanden)
 */
export function addUnassignedResource(
  resources: PlantafelResource[]
): PlantafelResource[] {
  // Prüfe, ob bereits vorhanden
  if (resources.some(r => r.resourceId === UNASSIGNED_RESOURCE_ID)) {
    return resources
  }
  
  // Füge am Ende hinzu
  return [...resources, getUnassignedResource()]
}

/**
 * Filtert Resources basierend auf Optionen
 */
export function filterResources(
  resources: PlantafelResource[],
  options: ResourceOptions = {}
): PlantafelResource[] {
  let filtered = [...resources]

  if (options.onlyActive) {
    filtered = filtered.filter(r => {
      if (r.type === 'employee') {
        return r.aktiv !== false
      }
      if (r.type === 'project') {
        return r.status === 'aktiv' || r.status === 'in_planung'
      }
      return true
    })
  }

  return filtered
}

/**
 * Sortiert Resources (Mitarbeiter nach Name, Projekte nach Name)
 */
export function sortResources(
  resources: PlantafelResource[]
): PlantafelResource[] {
  return [...resources].sort((a, b) => {
    // "Nicht zugewiesen" immer am Ende
    if (a.resourceId === UNASSIGNED_RESOURCE_ID) return 1
    if (b.resourceId === UNASSIGNED_RESOURCE_ID) return -1

    // Nach Titel sortieren
    return a.resourceTitle.localeCompare(b.resourceTitle, 'de')
  })
}

/**
 * Erstellt ein Set von Resource-IDs für schnellen Lookup
 */
export function createResourceIdSet(resources: PlantafelResource[]): Set<string> {
  const set = new Set<string>()
  resources.forEach(r => set.add(r.resourceId))
  
  // UNASSIGNED_RESOURCE_ID immer hinzufügen
  set.add(UNASSIGNED_RESOURCE_ID)
  
  return set
}

/**
 * Prüft, ob ein Event zur Resource-Liste gehört
 */
export function eventBelongsToResources(
  eventResourceId: string | undefined,
  resourceIdSet: Set<string>
): boolean {
  if (!eventResourceId && eventResourceId !== '') {
    return false
  }
  
  // Normalisiere leere resourceId zu UNASSIGNED_RESOURCE_ID
  const normalizedId = normalizeResourceId(eventResourceId)
  
  return resourceIdSet.has(normalizedId)
}

/**
 * Generiert einen Display-Namen für eine Resource
 */
export function getResourceDisplayName(resource: PlantafelResource): string {
  if (resource.type === 'employee') {
    if (resource.vorname && resource.nachname) {
      return `${resource.vorname} ${resource.nachname}`
    }
    return resource.resourceTitle
  }
  
  if (resource.type === 'project') {
    return resource.projektname || resource.resourceTitle
  }
  
  return resource.resourceTitle
}

// Export als Service-Objekt für einfachen Import
export const resourceService = {
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
}

export default resourceService
