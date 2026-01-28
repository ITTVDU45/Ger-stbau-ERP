/**
 * Unit-Tests für DragDropService
 */

import {
  validateDrop,
  calculateUpdates,
  calculateResizeUpdates,
  hasResourceChanged,
} from '../dragDropService'
import { UNASSIGNED_RESOURCE_ID } from '../constants'
import type { PlantafelEvent } from '../types'

// Mock Event für Tests
const createMockEvent = (overrides: Partial<PlantafelEvent> = {}): PlantafelEvent => ({
  id: 'einsatz-123-setup',
  title: 'Test Event',
  start: new Date('2026-01-27T08:00:00'),
  end: new Date('2026-01-27T17:00:00'),
  resourceId: 'mitarbeiter-456',
  type: 'einsatz',
  sourceType: 'einsatz',
  sourceId: '123',
  mitarbeiterId: 'mitarbeiter-456',
  projektId: 'projekt-789',
  setupDate: '2026-01-27',
  ...overrides,
})

describe('validateDrop', () => {
  it('sollte Urlaub-Events ablehnen', () => {
    const urlaubEvent = createMockEvent({ sourceType: 'urlaub' })
    const result = validateDrop(urlaubEvent, 'mitarbeiter-456', 'team')
    
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Abwesenheiten')
  })

  it('sollte Events ohne sourceId ablehnen', () => {
    const invalidEvent = createMockEvent({ sourceId: '' })
    const result = validateDrop(invalidEvent, 'mitarbeiter-456', 'team')
    
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('ID')
  })

  it('sollte gültige Drops akzeptieren', () => {
    const validEvent = createMockEvent()
    const result = validateDrop(validEvent, 'mitarbeiter-789', 'team')
    
    expect(result.valid).toBe(true)
  })

  it('sollte UNASSIGNED_RESOURCE_ID als gültiges Ziel akzeptieren', () => {
    const validEvent = createMockEvent()
    const result = validateDrop(validEvent, UNASSIGNED_RESOURCE_ID, 'team')
    
    expect(result.valid).toBe(true)
  })
})

describe('calculateUpdates', () => {
  it('sollte Datum-Updates korrekt berechnen', () => {
    const event = createMockEvent()
    const newDate = new Date('2026-01-28')
    
    const updates = calculateUpdates(event, newDate, 'mitarbeiter-456', 'team')
    
    expect(updates.von).toBeDefined()
    expect(updates.bis).toBeDefined()
  })

  it('sollte setupDate für Aufbau-Events aktualisieren', () => {
    const aufbauEvent = createMockEvent({ 
      id: 'einsatz-123-setup',
      setupDate: '2026-01-27'
    })
    const newDate = new Date('2026-01-28')
    
    const updates = calculateUpdates(aufbauEvent, newDate, 'mitarbeiter-456', 'team')
    
    expect(updates.setupDate).toBe('2026-01-28')
  })

  it('sollte dismantleDate für Abbau-Events aktualisieren', () => {
    const abbauEvent = createMockEvent({ 
      id: 'einsatz-123-dismantle',
      dismantleDate: '2026-01-30'
    })
    const newDate = new Date('2026-01-31')
    
    const updates = calculateUpdates(abbauEvent, newDate, 'mitarbeiter-456', 'team')
    
    expect(updates.dismantleDate).toBe('2026-01-31')
  })

  it('sollte mitarbeiterId im Team-View aktualisieren', () => {
    const event = createMockEvent()
    const newDate = new Date('2026-01-28')
    
    const updates = calculateUpdates(event, newDate, 'neuer-mitarbeiter', 'team')
    
    expect(updates.mitarbeiterId).toBe('neuer-mitarbeiter')
  })

  it('sollte projektId im Projekt-View aktualisieren', () => {
    const event = createMockEvent()
    const newDate = new Date('2026-01-28')
    
    const updates = calculateUpdates(event, newDate, 'neues-projekt', 'project')
    
    expect(updates.projektId).toBe('neues-projekt')
  })

  it('sollte UNASSIGNED_RESOURCE_ID zu undefined konvertieren', () => {
    const event = createMockEvent()
    const newDate = new Date('2026-01-28')
    
    const updates = calculateUpdates(event, newDate, UNASSIGNED_RESOURCE_ID, 'team')
    
    expect(updates.mitarbeiterId).toBeUndefined()
  })
})

describe('calculateResizeUpdates', () => {
  it('sollte von und bis korrekt berechnen', () => {
    const event = createMockEvent()
    const newStart = new Date('2026-01-27T09:00:00')
    const newEnd = new Date('2026-01-27T18:00:00')
    
    const updates = calculateResizeUpdates(event, newStart, newEnd)
    
    expect(updates.von).toBe(newStart.toISOString())
    expect(updates.bis).toBe(newEnd.toISOString())
  })
})

describe('hasResourceChanged', () => {
  it('sollte true zurückgeben wenn Resource geändert wurde', () => {
    const event = createMockEvent({ mitarbeiterId: 'mitarbeiter-123' })
    
    const result = hasResourceChanged(event, 'mitarbeiter-456', 'team')
    
    expect(result).toBe(true)
  })

  it('sollte false zurückgeben wenn Resource gleich bleibt', () => {
    const event = createMockEvent({ mitarbeiterId: 'mitarbeiter-123' })
    
    const result = hasResourceChanged(event, 'mitarbeiter-123', 'team')
    
    expect(result).toBe(false)
  })

  it('sollte UNASSIGNED_RESOURCE_ID korrekt behandeln', () => {
    const event = createMockEvent({ mitarbeiterId: undefined })
    
    const result = hasResourceChanged(event, UNASSIGNED_RESOURCE_ID, 'team')
    
    expect(result).toBe(false)
  })
})
