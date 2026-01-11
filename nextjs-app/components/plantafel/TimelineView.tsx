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
    <div className="flex flex-col h-full bg-white">
      {/* Outer Container mit Scroll */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header: Ressourcen + Tage (sticky oben) */}
        <div className="flex border-b-2 border-gray-300 bg-white sticky top-0 z-30 shadow-sm">
          {/* Ressourcen-Header-Platzhalter (sticky links) */}
          <div className="w-52 flex-shrink-0 border-r-2 border-gray-300 px-4 py-3 bg-gray-100 sticky left-0 z-40">
            <span className="font-bold text-sm text-gray-800">Ressource</span>
          </div>
          
          {/* Tage-Header (scrollbar) */}
          <div className="flex overflow-x-hidden">
            {days.map((day, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-40 border-r border-gray-200 px-3 py-3 text-center bg-gray-50"
              >
                <div className="font-semibold text-sm text-gray-900">
                  {format(day, 'EEEE', { locale: de })}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {format(day, 'dd. MMMM', { locale: de })}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Body: Ressourcen-Zeilen (scrollbar) */}
        <div className="flex-1 overflow-auto relative">
          <div className="inline-block min-w-full">
            {resources.map((resource, rowIdx) => {
              const resourceEvents = eventsByResource.get(resource.resourceId) || []
              
              return (
                <div
                  key={resource.resourceId}
                  className="flex border-b border-gray-200 min-h-[80px]"
                >
                  {/* Ressourcen-Name (links, sticky) */}
                  <div className={`
                    w-52 flex-shrink-0 border-r-2 border-gray-300 px-4 py-3 
                    flex items-center gap-3 sticky left-0 z-20 shadow-sm
                    ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  `}>
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
              <div className="flex">
                {days.map((day, dayIdx) => {
                  const dayEvents = resourceEvents.filter(e => isEventOnDay(e, day))
                  
                  return (
                    <div
                      key={dayIdx}
                      className={`
                        flex-shrink-0 w-40 border-r border-gray-200 p-2 cursor-pointer 
                        hover:bg-blue-50 transition-colors relative
                        ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      `}
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
                            text-xs px-2 py-1.5 mb-1.5 rounded-md cursor-pointer shadow
                            hover:shadow-lg transition-all truncate font-medium
                            ${event.sourceType === 'urlaub' 
                              ? 'bg-gray-200 text-gray-800 border-l-4 border-gray-500'
                              : event.hasConflict
                              ? 'bg-red-50 text-red-900 border-l-4 border-red-600 ring-1 ring-red-200'
                              : event.bestaetigt
                              ? 'bg-green-500 text-white border-l-4 border-green-700'
                              : 'bg-blue-500 text-white border-l-4 border-blue-700'
                            }
                          `}
                          style={{
                            backgroundColor: event.color && event.sourceType !== 'urlaub' ? event.color : undefined
                          }}
                          title={`${event.title}\n${format(event.start, 'HH:mm', { locale: de })} - ${format(event.end, 'HH:mm', { locale: de })}`}
                        >
                          <div className="flex items-center gap-1">
                            {event.hasConflict && <span className="text-red-600">⚠️</span>}
                            <span className="truncate">{event.title}</span>
                          </div>
                          <div className="text-[10px] opacity-80 mt-0.5">
                            {format(event.start, 'HH:mm', { locale: de })} - {format(event.end, 'HH:mm', { locale: de })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
          </div>
          
          {resources.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-gray-500 text-sm">Keine Ressourcen vorhanden.</p>
                <p className="text-gray-400 text-xs mt-1">Bitte Filter anpassen.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
