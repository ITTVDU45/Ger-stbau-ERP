/**
 * EventMappingService
 * 
 * Service für das Mapping von Einsätzen zu Plantafel-Events.
 * Zentrale Logik für konsistente resourceId-Berechnung und Titel-Generierung.
 */

import { Einsatz } from '@/lib/db/types'
import { UNASSIGNED_RESOURCE_ID, EVENT_COLORS } from './constants'
import type { 
  PlantafelEvent, 
  PlantafelView, 
  PlantafelEventType,
  EventMappingOptions 
} from './types'

/**
 * Berechnet die resourceId für einen Einsatz basierend auf dem View
 */
export function getResourceId(
  einsatz: Einsatz,
  view: PlantafelView
): string {
  if (view === 'team') {
    // Team-View: mitarbeiterId oder UNASSIGNED_RESOURCE_ID
    return einsatz.mitarbeiterId || UNASSIGNED_RESOURCE_ID
  } else {
    // Projekt-View: projektId (leer bedeutet Event wird gefiltert)
    return einsatz.projektId || ''
  }
}

/**
 * Generiert den Event-Titel basierend auf View und Einsatz-Daten
 */
export function getEventTitle(
  einsatz: Einsatz,
  view: PlantafelView,
  suffix?: string
): string {
  let baseTitle: string

  // Prüfe ob Projektname wirklich ein Projekt ist (nicht "Nicht zugewiesen")
  const hasValidProjekt = einsatz.projektName && einsatz.projektName !== 'Nicht zugewiesen'
  const hasValidMitarbeiter = einsatz.mitarbeiterId && einsatz.mitarbeiterName && einsatz.mitarbeiterName !== 'Nicht zugewiesen'

  if (view === 'team') {
    // Team-View: Zeigt Mitarbeitername (wenn vorhanden), sonst Projektname
    baseTitle = hasValidMitarbeiter 
      ? einsatz.mitarbeiterName! 
      : (hasValidProjekt ? einsatz.projektName! : 'Kein Projekt')
  } else {
    // Projekt-View: Zeigt Projektname (nicht Mitarbeitername)
    baseTitle = hasValidProjekt ? einsatz.projektName! : 'Kein Projekt'
  }

  return suffix ? `${baseTitle} ${suffix}` : baseTitle
}

/**
 * Erstellt ein Basis-Event-Objekt ohne Datum-spezifische Felder
 */
function createBaseEvent(
  einsatz: Einsatz,
  view: PlantafelView
): Omit<PlantafelEvent, 'id' | 'title' | 'start' | 'end' | 'resourceId'> {
  return {
    type: 'einsatz' as PlantafelEventType,
    sourceType: 'einsatz' as const,
    sourceId: einsatz._id?.toString() || '',
    mitarbeiterId: einsatz.mitarbeiterId,
    mitarbeiterName: einsatz.mitarbeiterName,
    projektId: einsatz.projektId,
    projektName: einsatz.projektName,
    notes: einsatz.notizen,
    bestaetigt: einsatz.bestaetigt,
    rolle: einsatz.rolle,
    hasConflict: false,
    // NEU: Simplified date-only Felder
    setupDate: einsatz.setupDate,
    dismantleDate: einsatz.dismantleDate,
    // LEGACY: Alte Felder für Abwärtskompatibilität
    aufbauVon: einsatz.aufbauVon ? new Date(einsatz.aufbauVon) : undefined,
    aufbauBis: einsatz.aufbauBis ? new Date(einsatz.aufbauBis) : undefined,
    stundenAufbau: einsatz.stundenAufbau,
    abbauVon: einsatz.abbauVon ? new Date(einsatz.abbauVon) : undefined,
    abbauBis: einsatz.abbauBis ? new Date(einsatz.abbauBis) : undefined,
    stundenAbbau: einsatz.stundenAbbau,
  }
}

/**
 * Mappt einen Einsatz auf mehrere PlantafelEvents (Aufbau + Abbau separat)
 */
export function mapEinsatzToEvents(
  einsatz: Einsatz,
  view: PlantafelView,
  options: EventMappingOptions = {}
): PlantafelEvent[] {
  const events: PlantafelEvent[] = []
  const resourceId = getResourceId(einsatz, view)
  const baseEvent = createBaseEvent(einsatz, view)

  // NEU: Prüfe zuerst simplified setup/dismantle
  if (einsatz.setupDate || einsatz.dismantleDate) {
    // Nutze neue date-only Logik - Ganztägige Events (allDay: true)
    if (einsatz.setupDate) {
      const [year, month, day] = einsatz.setupDate.split('-').map(Number)
      const setupStart = new Date(year, month - 1, day, 0, 0, 0, 0)
      const setupEnd = new Date(year, month - 1, day, 0, 0, 0, 1)
      
      events.push({
        ...baseEvent,
        id: `einsatz-${einsatz._id}-setup`,
        title: getEventTitle(einsatz, view, '(Aufbau)'),
        start: setupStart,
        end: setupEnd,
        resourceId,
        color: EVENT_COLORS.aufbau,
        allDay: true,
      })
    }
    
    if (einsatz.dismantleDate) {
      const [year, month, day] = einsatz.dismantleDate.split('-').map(Number)
      const dismantleStart = new Date(year, month - 1, day, 0, 0, 0, 0)
      const dismantleEnd = new Date(year, month - 1, day, 0, 0, 0, 1)
      
      events.push({
        ...baseEvent,
        id: `einsatz-${einsatz._id}-dismantle`,
        title: getEventTitle(einsatz, view, '(Abbau)'),
        start: dismantleStart,
        end: dismantleEnd,
        resourceId,
        color: EVENT_COLORS.abbau,
        allDay: true,
      })
    }
    
    return events
  }

  // LEGACY: Alte Logik für Aufbau/Abbau mit Uhrzeiten (Abwärtskompatibilität)
  if (einsatz.aufbauVon && einsatz.stundenAufbau && einsatz.stundenAufbau > 0) {
    const aufbauStart = new Date(einsatz.aufbauVon)
    const aufbauEnd = einsatz.aufbauBis ? new Date(einsatz.aufbauBis) : new Date(einsatz.aufbauVon)

    events.push({
      ...baseEvent,
      id: `einsatz-${einsatz._id}-aufbau`,
      title: getEventTitle(einsatz, view, '(Aufbau)'),
      start: aufbauStart,
      end: aufbauEnd,
      resourceId,
      color: EVENT_COLORS.aufbau,
    })
  }

  if (einsatz.abbauVon && einsatz.stundenAbbau && einsatz.stundenAbbau > 0) {
    const abbauStart = new Date(einsatz.abbauVon)
    const abbauEnd = einsatz.abbauBis ? new Date(einsatz.abbauBis) : new Date(einsatz.abbauVon)

    events.push({
      ...baseEvent,
      id: `einsatz-${einsatz._id}-abbau`,
      title: getEventTitle(einsatz, view, '(Abbau)'),
      start: abbauStart,
      end: abbauEnd,
      resourceId,
      color: EVENT_COLORS.abbau,
    })
  }

  // Fallback: Standard-Event wenn keine Aufbau/Abbau-Daten
  if (events.length === 0 && einsatz.von && einsatz.bis) {
    events.push({
      ...baseEvent,
      id: `einsatz-${einsatz._id}`,
      title: getEventTitle(einsatz, view),
      start: new Date(einsatz.von),
      end: new Date(einsatz.bis),
      resourceId,
      color: EVENT_COLORS.einsatz,
    })
  }

  return events
}

/**
 * Prüft, ob ein Event zur angegebenen Resource gehört
 */
export function eventBelongsToResource(
  event: PlantafelEvent,
  resourceId: string
): boolean {
  return event.resourceId === resourceId
}

/**
 * Filtert Events nach Resource
 */
export function filterEventsByResource(
  events: PlantafelEvent[],
  resourceId: string
): PlantafelEvent[] {
  return events.filter(event => eventBelongsToResource(event, resourceId))
}

/**
 * Prüft, ob ein Event im angegebenen Zeitraum liegt
 */
export function eventInDateRange(
  event: PlantafelEvent,
  start: Date,
  end: Date
): boolean {
  return event.start <= end && event.end >= start
}

// Export als Service-Objekt für einfachen Import
export const eventMappingService = {
  getResourceId,
  getEventTitle,
  mapEinsatzToEvents,
  eventBelongsToResource,
  filterEventsByResource,
  eventInDateRange,
}

export default eventMappingService
