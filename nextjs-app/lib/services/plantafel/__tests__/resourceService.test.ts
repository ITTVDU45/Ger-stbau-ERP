/**
 * Unit-Tests für ResourceService
 */

import {
  getUnassignedResource,
  isUnassignedResource,
  normalizeResourceId,
  toApiResourceId,
  findResourceById,
  hasResource,
  addUnassignedResource,
  createResourceIdSet,
  eventBelongsToResources,
  sortResources,
} from '../resourceService'
import { UNASSIGNED_RESOURCE_ID, UNASSIGNED_RESOURCE_TITLE } from '../constants'
import type { PlantafelResource } from '../types'

// Mock Resources für Tests
const createMockResource = (overrides: Partial<PlantafelResource> = {}): PlantafelResource => ({
  resourceId: 'resource-123',
  resourceTitle: 'Test Resource',
  type: 'employee',
  aktiv: true,
  vorname: 'Max',
  nachname: 'Mustermann',
  ...overrides,
})

describe('getUnassignedResource', () => {
  it('sollte korrekte Resource für "Nicht zugewiesen" zurückgeben', () => {
    const resource = getUnassignedResource()
    
    expect(resource.resourceId).toBe(UNASSIGNED_RESOURCE_ID)
    expect(resource.resourceTitle).toBe(UNASSIGNED_RESOURCE_TITLE)
    expect(resource.type).toBe('employee')
    expect(resource.aktiv).toBe(true)
  })
})

describe('isUnassignedResource', () => {
  it('sollte true für UNASSIGNED_RESOURCE_ID zurückgeben', () => {
    expect(isUnassignedResource(UNASSIGNED_RESOURCE_ID)).toBe(true)
  })

  it('sollte true für leeren String zurückgeben', () => {
    expect(isUnassignedResource('')).toBe(true)
  })

  it('sollte true für undefined zurückgeben', () => {
    expect(isUnassignedResource(undefined)).toBe(true)
  })

  it('sollte true für null zurückgeben', () => {
    expect(isUnassignedResource(null)).toBe(true)
  })

  it('sollte false für gültige IDs zurückgeben', () => {
    expect(isUnassignedResource('mitarbeiter-123')).toBe(false)
  })
})

describe('normalizeResourceId', () => {
  it('sollte leere Werte zu UNASSIGNED_RESOURCE_ID normalisieren', () => {
    expect(normalizeResourceId('')).toBe(UNASSIGNED_RESOURCE_ID)
    expect(normalizeResourceId(undefined)).toBe(UNASSIGNED_RESOURCE_ID)
    expect(normalizeResourceId(null)).toBe(UNASSIGNED_RESOURCE_ID)
  })

  it('sollte gültige IDs unverändert lassen', () => {
    expect(normalizeResourceId('mitarbeiter-123')).toBe('mitarbeiter-123')
  })
})

describe('toApiResourceId', () => {
  it('sollte UNASSIGNED_RESOURCE_ID zu undefined konvertieren', () => {
    expect(toApiResourceId(UNASSIGNED_RESOURCE_ID)).toBeUndefined()
  })

  it('sollte gültige IDs unverändert lassen', () => {
    expect(toApiResourceId('mitarbeiter-123')).toBe('mitarbeiter-123')
  })
})

describe('findResourceById', () => {
  const resources = [
    createMockResource({ resourceId: 'res-1' }),
    createMockResource({ resourceId: 'res-2' }),
    createMockResource({ resourceId: 'res-3' }),
  ]

  it('sollte Resource anhand ID finden', () => {
    const found = findResourceById('res-2', resources)
    
    expect(found).not.toBeNull()
    expect(found?.resourceId).toBe('res-2')
  })

  it('sollte null für nicht gefundene IDs zurückgeben', () => {
    const found = findResourceById('nicht-existent', resources)
    
    expect(found).toBeNull()
  })
})

describe('hasResource', () => {
  const resources = [
    createMockResource({ resourceId: 'res-1' }),
    createMockResource({ resourceId: 'res-2' }),
  ]

  it('sollte true für vorhandene Resource zurückgeben', () => {
    expect(hasResource('res-1', resources)).toBe(true)
  })

  it('sollte false für nicht vorhandene Resource zurückgeben', () => {
    expect(hasResource('res-99', resources)).toBe(false)
  })

  it('sollte true für UNASSIGNED_RESOURCE_ID zurückgeben', () => {
    expect(hasResource(UNASSIGNED_RESOURCE_ID, resources)).toBe(true)
  })
})

describe('addUnassignedResource', () => {
  it('sollte "Nicht zugewiesen" Resource hinzufügen', () => {
    const resources = [createMockResource({ resourceId: 'res-1' })]
    
    const result = addUnassignedResource(resources)
    
    expect(result.length).toBe(2)
    expect(result[result.length - 1].resourceId).toBe(UNASSIGNED_RESOURCE_ID)
  })

  it('sollte nicht duplizieren wenn bereits vorhanden', () => {
    const resources = [
      createMockResource({ resourceId: 'res-1' }),
      createMockResource({ resourceId: UNASSIGNED_RESOURCE_ID }),
    ]
    
    const result = addUnassignedResource(resources)
    
    expect(result.length).toBe(2)
  })
})

describe('createResourceIdSet', () => {
  it('sollte Set mit allen Resource-IDs erstellen', () => {
    const resources = [
      createMockResource({ resourceId: 'res-1' }),
      createMockResource({ resourceId: 'res-2' }),
    ]
    
    const set = createResourceIdSet(resources)
    
    expect(set.has('res-1')).toBe(true)
    expect(set.has('res-2')).toBe(true)
  })

  it('sollte UNASSIGNED_RESOURCE_ID automatisch hinzufügen', () => {
    const resources = [createMockResource({ resourceId: 'res-1' })]
    
    const set = createResourceIdSet(resources)
    
    expect(set.has(UNASSIGNED_RESOURCE_ID)).toBe(true)
  })
})

describe('eventBelongsToResources', () => {
  const resourceIdSet = new Set(['res-1', 'res-2', UNASSIGNED_RESOURCE_ID])

  it('sollte true für Events in Resources zurückgeben', () => {
    expect(eventBelongsToResources('res-1', resourceIdSet)).toBe(true)
  })

  it('sollte false für Events außerhalb Resources zurückgeben', () => {
    expect(eventBelongsToResources('res-99', resourceIdSet)).toBe(false)
  })

  it('sollte leere resourceId zu UNASSIGNED_RESOURCE_ID normalisieren', () => {
    expect(eventBelongsToResources('', resourceIdSet)).toBe(true)
  })
})

describe('sortResources', () => {
  it('sollte Resources alphabetisch sortieren', () => {
    const resources = [
      createMockResource({ resourceId: 'c', resourceTitle: 'Charlie' }),
      createMockResource({ resourceId: 'a', resourceTitle: 'Alpha' }),
      createMockResource({ resourceId: 'b', resourceTitle: 'Bravo' }),
    ]
    
    const sorted = sortResources(resources)
    
    expect(sorted[0].resourceTitle).toBe('Alpha')
    expect(sorted[1].resourceTitle).toBe('Bravo')
    expect(sorted[2].resourceTitle).toBe('Charlie')
  })

  it('sollte "Nicht zugewiesen" am Ende platzieren', () => {
    const resources = [
      createMockResource({ resourceId: 'a', resourceTitle: 'Alpha' }),
      createMockResource({ resourceId: UNASSIGNED_RESOURCE_ID, resourceTitle: UNASSIGNED_RESOURCE_TITLE }),
      createMockResource({ resourceId: 'z', resourceTitle: 'Zulu' }),
    ]
    
    const sorted = sortResources(resources)
    
    expect(sorted[sorted.length - 1].resourceId).toBe(UNASSIGNED_RESOURCE_ID)
  })
})
