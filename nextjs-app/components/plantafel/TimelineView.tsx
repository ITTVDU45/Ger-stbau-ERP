'use client'

/**
 * TimelineView - Custom Timeline für Plantafel
 * 
 * Zeigt Ressourcen (Mitarbeiter/Projekte) vertikal als Zeilen
 * und Zeit horizontal als Spalten
 */

import { useMemo } from 'react'
import { format, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns'
import { de } from 'date-fns/locale'
import { PlantafelEvent, PlantafelResource, DateRange } from './types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface TimelineViewProps {
  resources: PlantafelResource[]
  events: PlantafelEvent[]
  dateRange: DateRange
  onEventClick?: (event: PlantafelEvent) => void
  onSlotClick?: (resourceId: string, date: Date) => void
}

export default function TimelineView({
  resources,
  events,
  dateRange,
  onEventClick,
  onSlotClick
}: TimelineViewProps) {
  // Tage im Zeitraum berechnen
  const days = useMemo(() => {
    // Wenn start == end, dann nur einen Tag anzeigen
    if (dateRange.start.getTime() === dateRange.end.getTime()) {
      return [dateRange.start]
    }
    return eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end
    })
  }, [dateRange])
  
  // Events nach Ressource gruppieren
  const eventsByResource = useMemo(() => {
    const map = new Map<string, PlantafelEvent[]>()
    resources.forEach(r => map.set(r.resourceId, []))
    events.forEach(event => {
      const existing = map.get(event.resourceId) || []
      map.set(event.resourceId, [...existing, event])
    })
    return map
  }, [resources, events])
  
  // Prüfe ob Event an einem Tag aktiv ist
  const isEventOnDay = (event: PlantafelEvent, day: Date): boolean => {
    return isWithinInterval(day, { start: event.start, end: event.end }) ||
           isSameDay(event.start, day) ||
           isSameDay(event.end, day)
  }
  
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header: Tage */}
      <div className="flex border-b-2 border-gray-300 bg-gray-50 sticky top-0 z-20">
        {/* Ressourcen-Header-Platzhalter */}
        <div className="w-48 flex-shrink-0 border-r-2 border-gray-300 px-4 py-3 bg-gray-100">
          <span className="font-bold text-sm text-gray-700">Ressource</span>
        </div>
        
        {/* Tage-Header */}
        <div className="flex-1 flex overflow-x-auto">
          {days.map((day, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-32 border-r border-gray-200 px-2 py-3 text-center"
            >
              <div className="font-semibold text-xs text-gray-900">
                {format(day, 'EEE', { locale: de })}
              </div>
              <div className="text-sm text-gray-700">
                {format(day, 'dd.MM.', { locale: de })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Body: Ressourcen-Zeilen */}
      <div className="flex-1 overflow-auto">
        {resources.map((resource, rowIdx) => {
          const resourceEvents = eventsByResource.get(resource.resourceId) || []
          
          return (
            <div
              key={resource.resourceId}
              className={`flex border-b border-gray-200 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
            >
              {/* Ressourcen-Name (links, sticky) */}
              <div className="w-48 flex-shrink-0 border-r border-gray-300 px-4 py-3 flex items-center gap-3 sticky left-0 bg-inherit z-10">
                {resource.type === 'employee' ? (
                  <>
                    {resource.profilbildUrl ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={resource.profilbildUrl} />
                        <AvatarFallback className="text-xs">
                          {resource.vorname?.[0]}{resource.nachname?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                        {resource.vorname?.[0]}{resource.nachname?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {resource.resourceTitle}
                      </p>
                      {resource.availability && !resource.availability.available && (
                        <p className="text-xs text-red-600">
                          {resource.availability.reason === 'vacation' ? '🏖️ Urlaub' :
                           resource.availability.reason === 'sick' ? '🤒 Krank' : '⚠️ Nicht verfügbar'}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-green-700">P</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {resource.resourceTitle}
                      </p>
                      {resource.kundeName && (
                        <p className="text-xs text-gray-500 truncate">{resource.kundeName}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {/* Timeline-Zellen */}
              <div className="flex-1 flex relative">
                {days.map((day, dayIdx) => {
                  const dayEvents = resourceEvents.filter(e => isEventOnDay(e, day))
                  
                  return (
                    <div
                      key={dayIdx}
                      className="flex-shrink-0 w-32 border-r border-gray-100 p-1 cursor-pointer hover:bg-blue-50 relative"
                      onClick={() => onSlotClick && onSlotClick(resource.resourceId, day)}
                    >
                      {dayEvents.map((event, eventIdx) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick && onEventClick(event)
                          }}
                          className={`
                            text-xs px-2 py-1 mb-1 rounded cursor-pointer shadow-sm
                            hover:shadow-md transition-shadow truncate
                            ${event.sourceType === 'urlaub' 
                              ? 'bg-gray-300 text-gray-800 border border-gray-400'
                              : event.hasConflict
                              ? 'bg-red-100 text-red-900 border-2 border-red-500'
                              : event.bestaetigt
                              ? 'bg-green-500 text-white'
                              : 'bg-blue-500 text-white'
                            }
                          `}
                          style={{
                            backgroundColor: event.color && event.sourceType !== 'urlaub' ? event.color : undefined
                          }}
                          title={`${event.title}\n${format(event.start, 'HH:mm', { locale: de })} - ${format(event.end, 'HH:mm', { locale: de })}`}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        
        {resources.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Keine Ressourcen vorhanden. Bitte Filter anpassen.
          </div>
        )}
      </div>
    </div>
  )
}
