/**
 * Unit-Tests für EventMappingService
 */

import {
  getResourceId,
  getEventTitle,
  mapEinsatzToEvents,
  eventBelongsToResource,
  filterEventsByResource,
  eventInDateRange,
} from '../eventMappingService'
import { UNASSIGNED_RESOURCE_ID } from '../constants'
import type { Einsatz } from '@/lib/db/types'
import type { PlantafelEvent } from '../types'

// Mock Einsatz für Tests
const createMockEinsatz = (overrides: Partial<Einsatz> = {}): Einsatz => ({
  _id: '123',
  mitarbeiterId: 'mitarbeiter-456',
  mitarbeiterName: 'Max Mustermann',
  projektId: 'projekt-789',
  projektName: 'Test Projekt',
  von: new Date('2026-01-27T08:00:00'),
  bis: new Date('2026-01-27T17:00:00'),
  notizen: 'Test Notizen',
  bestaetigt: false,
  setupDate: '2026-01-27',
  erstelltAm: new Date(),
  zuletztGeaendert: new Date(),
  ...overrides,
})

// Mock Event für Tests
const createMockEvent = (overrides: Partial<PlantafelEvent> = {}): PlantafelEvent => ({
  id: 'einsatz-123',
  title: 'Test Event',
  start: new Date('2026-01-27T08:00:00'),
  end: new Date('2026-01-27T17:00:00'),
  resourceId: 'mitarbeiter-456',
  type: 'einsatz',
  sourceType: 'einsatz',
  sourceId: '123',
  ...overrides,
})

describe('getResourceId', () => {
  it('sollte mitarbeiterId im Team-View zurückgeben', () => {
    const einsatz = createMockEinsatz({ mitarbeiterId: 'ma-123' })
    
    const resourceId = getResourceId(einsatz, 'team')
    
    expect(resourceId).toBe('ma-123')
  })

  it('sollte projektId im Projekt-View zurückgeben', () => {
    const einsatz = createMockEinsatz({ projektId: 'proj-456' })
    
    const resourceId = getResourceId(einsatz, 'project')
    
    expect(resourceId).toBe('proj-456')
  })

  it('sollte UNASSIGNED_RESOURCE_ID im Team-View ohne Mitarbeiter zurückgeben', () => {
    const einsatz = createMockEinsatz({ mitarbeiterId: undefined })
    
    const resourceId = getResourceId(einsatz, 'team')
    
    expect(resourceId).toBe(UNASSIGNED_RESOURCE_ID)
  })

  it('sollte leeren String im Projekt-View ohne Projekt zurückgeben', () => {
    const einsatz = createMockEinsatz({ projektId: undefined })
    
    const resourceId = getResourceId(einsatz, 'project')
    
    expect(resourceId).toBe('')
  })
})

describe('getEventTitle', () => {
  it('sollte Mitarbeitername im Team-View zurückgeben (wenn Mitarbeiter vorhanden)', () => {
    const einsatz = createMockEinsatz({ 
      projektName: 'Mein Projekt',
      mitarbeiterName: 'Max Mustermann'
    })
    
    const title = getEventTitle(einsatz, 'team')
    
    expect(title).toBe('Max Mustermann')
  })
  
  it('sollte Projektname im Team-View zurückgeben (wenn kein Mitarbeiter)', () => {
    const einsatz = createMockEinsatz({ 
      projektName: 'Mein Projekt',
      mitarbeiterId: undefined,
      mitarbeiterName: undefined
    })
    
    const title = getEventTitle(einsatz, 'team')
    
    expect(title).toBe('Mein Projekt')
  })

  it('sollte Projektname im Projekt-View zurückgeben', () => {
    const einsatz = createMockEinsatz({ 
      projektName: 'Mein Projekt',
      mitarbeiterId: 'ma-123',
      mitarbeiterName: 'Max Mustermann' 
    })
    
    const title = getEventTitle(einsatz, 'project')
    
    expect(title).toBe('Mein Projekt')
  })

  it('sollte Mitarbeitername im Team-View ohne Projekt zurückgeben', () => {
    const einsatz = createMockEinsatz({ 
      projektName: undefined,
      mitarbeiterName: 'Max Mustermann'
    })
    
    const title = getEventTitle(einsatz, 'team')
    
    expect(title).toBe('Max Mustermann')
  })

  it('sollte "Kein Projekt" im Team-View ohne Projekt und ohne Mitarbeiter zurückgeben', () => {
    const einsatz = createMockEinsatz({ 
      projektName: undefined,
      mitarbeiterName: undefined
    })
    
    const title = getEventTitle(einsatz, 'team')
    
    expect(title).toBe('Kein Projekt')
  })

  it('sollte "Kein Projekt" im Projekt-View ohne Projekt zurückgeben', () => {
    const einsatz = createMockEinsatz({ 
      projektName: undefined,
      mitarbeiterId: 'ma-123',
      mitarbeiterName: 'Max Mustermann' 
    })
    
    const title = getEventTitle(einsatz, 'project')
    
    expect(title).toBe('Kein Projekt')
  })
  
  it('sollte "Kein Projekt" im Projekt-View mit "Nicht zugewiesen" als projektName zurückgeben', () => {
    const einsatz = createMockEinsatz({ 
      projektName: 'Nicht zugewiesen',
      mitarbeiterId: 'ma-123',
      mitarbeiterName: 'Max Mustermann' 
    })
    
    const title = getEventTitle(einsatz, 'project')
    
    expect(title).toBe('Kein Projekt')
  })

  it('sollte Suffix anhängen wenn angegeben', () => {
    const einsatz = createMockEinsatz({ projektName: 'Mein Projekt' })
    
    const title = getEventTitle(einsatz, 'team', '(Aufbau)')
    
    expect(title).toBe('Mein Projekt (Aufbau)')
  })
})

describe('mapEinsatzToEvents', () => {
  it('sollte Aufbau-Event für setupDate erstellen', () => {
    const einsatz = createMockEinsatz({ 
      setupDate: '2026-01-27',
      dismantleDate: undefined 
    })
    
    const events = mapEinsatzToEvents(einsatz, 'team')
    
    expect(events.length).toBe(1)
    expect(events[0].id).toContain('-setup')
    expect(events[0].title).toContain('(Aufbau)')
    expect(events[0].allDay).toBe(true)
  })

  it('sollte Abbau-Event für dismantleDate erstellen', () => {
    const einsatz = createMockEinsatz({ 
      setupDate: undefined,
      dismantleDate: '2026-01-30' 
    })
    
    const events = mapEinsatzToEvents(einsatz, 'team')
    
    expect(events.length).toBe(1)
    expect(events[0].id).toContain('-dismantle')
    expect(events[0].title).toContain('(Abbau)')
    expect(events[0].allDay).toBe(true)
  })

  it('sollte beide Events für Aufbau und Abbau erstellen', () => {
    const einsatz = createMockEinsatz({ 
      setupDate: '2026-01-27',
      dismantleDate: '2026-01-30' 
    })
    
    const events = mapEinsatzToEvents(einsatz, 'team')
    
    expect(events.length).toBe(2)
    expect(events.some(e => e.id.includes('-setup'))).toBe(true)
    expect(events.some(e => e.id.includes('-dismantle'))).toBe(true)
  })

  it('sollte korrekte resourceId im Team-View setzen', () => {
    const einsatz = createMockEinsatz({ 
      mitarbeiterId: 'ma-123',
      setupDate: '2026-01-27'
    })
    
    const events = mapEinsatzToEvents(einsatz, 'team')
    
    expect(events[0].resourceId).toBe('ma-123')
  })

  it('sollte UNASSIGNED_RESOURCE_ID für Einsätze ohne Mitarbeiter setzen', () => {
    const einsatz = createMockEinsatz({ 
      mitarbeiterId: undefined,
      setupDate: '2026-01-27'
    })
    
    const events = mapEinsatzToEvents(einsatz, 'team')
    
    expect(events[0].resourceId).toBe(UNASSIGNED_RESOURCE_ID)
  })
})

describe('eventBelongsToResource', () => {
  it('sollte true zurückgeben wenn Event zur Resource gehört', () => {
    const event = createMockEvent({ resourceId: 'res-123' })
    
    const result = eventBelongsToResource(event, 'res-123')
    
    expect(result).toBe(true)
  })

  it('sollte false zurückgeben wenn Event nicht zur Resource gehört', () => {
    const event = createMockEvent({ resourceId: 'res-123' })
    
    const result = eventBelongsToResource(event, 'res-456')
    
    expect(result).toBe(false)
  })
})

describe('filterEventsByResource', () => {
  const events = [
    createMockEvent({ id: 'e1', resourceId: 'res-1' }),
    createMockEvent({ id: 'e2', resourceId: 'res-2' }),
    createMockEvent({ id: 'e3', resourceId: 'res-1' }),
  ]

  it('sollte nur Events der angegebenen Resource zurückgeben', () => {
    const filtered = filterEventsByResource(events, 'res-1')
    
    expect(filtered.length).toBe(2)
    expect(filtered.every(e => e.resourceId === 'res-1')).toBe(true)
  })

  it('sollte leeres Array zurückgeben wenn keine Events matchen', () => {
    const filtered = filterEventsByResource(events, 'res-99')
    
    expect(filtered.length).toBe(0)
  })
})

describe('eventInDateRange', () => {
  it('sollte true zurückgeben wenn Event im Zeitraum liegt', () => {
    const event = createMockEvent({
      start: new Date('2026-01-27'),
      end: new Date('2026-01-28'),
    })
    
    const result = eventInDateRange(
      event,
      new Date('2026-01-26'),
      new Date('2026-01-29')
    )
    
    expect(result).toBe(true)
  })

  it('sollte false zurückgeben wenn Event außerhalb liegt', () => {
    const event = createMockEvent({
      start: new Date('2026-01-27'),
      end: new Date('2026-01-28'),
    })
    
    const result = eventInDateRange(
      event,
      new Date('2026-01-01'),
      new Date('2026-01-10')
    )
    
    expect(result).toBe(false)
  })

  it('sollte true zurückgeben wenn Event teilweise überlappt', () => {
    const event = createMockEvent({
      start: new Date('2026-01-27'),
      end: new Date('2026-01-30'),
    })
    
    const result = eventInDateRange(
      event,
      new Date('2026-01-28'),
      new Date('2026-01-29')
    )
    
    expect(result).toBe(true)
  })
})
