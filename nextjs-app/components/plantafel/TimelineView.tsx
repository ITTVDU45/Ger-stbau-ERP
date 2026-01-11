'use client'

/**
 * TimelineView - Custom Timeline für Plantafel
 * 
 * Zeigt Ressourcen (Mitarbeiter/Projekte) vertikal als Zeilen
 * und Zeit horizontal als Spalten
 */

import { useMemo, useState } from 'react'
import { format, eachDayOfInterval, isSameDay, isWithinInterval, addDays, differenceInDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { PlantafelEvent, PlantafelResource, DateRange } from './types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUpdateAssignment, useDeleteAssignment } from '@/lib/queries/plantafelQueries'

interface TimelineViewProps {
  resources: PlantafelResource[]
  events: PlantafelEvent[]
  dateRange: DateRange
  onEventClick?: (event: PlantafelEvent) => void
  onSlotClick?: (resourceId: string, date: Date) => void
}

// Feste Breiten in Pixeln für perfekte Ausrichtung
const RESOURCE_WIDTH = 208 // px
const DAY_WIDTH = 160 // px

export default function TimelineView({
  resources,
  events,
  dateRange,
  onEventClick,
  onSlotClick
}: TimelineViewProps) {
  const [draggedEvent, setDraggedEvent] = useState<PlantafelEvent | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{ resourceId: string; day: Date } | null>(null)
  
  const updateMutation = useUpdateAssignment()
  const deleteMutation = useDeleteAssignment()
  
  // Tage im Zeitraum berechnen
  const days = useMemo(() => {
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
  
  // Drag & Drop Handler
  const handleDragStart = (e: React.DragEvent, event: PlantafelEvent) => {
    if (event.sourceType === 'urlaub') {
      e.preventDefault()
      toast.error('Abwesenheiten können nicht verschoben werden')
      return
    }
    setDraggedEvent(event)
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e: React.DragEvent, resourceId: string, day: Date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCell({ resourceId, day })
  }
  
  const handleDragLeave = () => {
    setDragOverCell(null)
  }
  
  const handleDrop = async (e: React.DragEvent, targetResourceId: string, targetDay: Date) => {
    e.preventDefault()
    setDragOverCell(null)
    
    if (!draggedEvent) return
    
    try {
      // Berechne die Verschiebung in Tagen
      const daysDiff = differenceInDays(targetDay, draggedEvent.start)
      
      // Neue Start- und Endzeiten
      const newStart = addDays(draggedEvent.start, daysDiff)
      const newEnd = addDays(draggedEvent.end, daysDiff)
      
      await updateMutation.mutateAsync({
        id: draggedEvent.sourceId,
        data: {
          von: newStart.toISOString(),
          bis: newEnd.toISOString(),
          // Ressource nur ändern wenn verschieden
          ...(targetResourceId !== draggedEvent.resourceId && {
            mitarbeiterId: targetResourceId,
          })
        }
      })
      
      toast.success('Einsatz verschoben')
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Verschieben')
    } finally {
      setDraggedEvent(null)
    }
  }
  
  const handleDragEnd = () => {
    setDraggedEvent(null)
    setDragOverCell(null)
  }
  
  // Löschen Handler
  const handleDelete = async (e: React.MouseEvent, event: PlantafelEvent) => {
    e.stopPropagation()
    
    if (event.sourceType === 'urlaub') {
      toast.error('Abwesenheiten können hier nicht gelöscht werden')
      return
    }
    
    if (!confirm('Möchten Sie diesen Einsatz wirklich löschen?')) {
      return
    }
    
    try {
      await deleteMutation.mutateAsync(event.sourceId)
      toast.success('Einsatz gelöscht')
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Löschen')
    }
  }
  
  // Berechne Gesamtbreite
  const totalWidth = RESOURCE_WIDTH + (days.length * DAY_WIDTH)
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Scrollbarer Container */}
      <div className="flex-1 overflow-auto">
        {/* Content mit fester Breite */}
        <div style={{ width: `${totalWidth}px` }}>
          
          {/* HEADER ROW - Sticky */}
          <div className="flex sticky top-0 z-50 bg-white border-b-2 border-gray-300 shadow-md">
            {/* Ressourcen-Header */}
            <div 
              style={{ width: `${RESOURCE_WIDTH}px`, minWidth: `${RESOURCE_WIDTH}px` }}
              className="flex-shrink-0 sticky left-0 z-50 bg-gray-100 border-r-2 border-gray-300 px-4 py-3"
            >
              <span className="font-bold text-sm text-gray-800">Ressource</span>
            </div>
            
            {/* Tage-Header */}
            {days.map((day, idx) => (
              <div
                key={idx}
                style={{ width: `${DAY_WIDTH}px`, minWidth: `${DAY_WIDTH}px` }}
                className="flex-shrink-0 border-r border-gray-200 bg-gray-50 px-3 py-3 text-center"
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
          
          {/* BODY ROWS */}
          {resources.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center p-8">
                <p className="text-gray-500 text-sm">Keine Ressourcen vorhanden.</p>
                <p className="text-gray-400 text-xs mt-1">Bitte Filter anpassen.</p>
              </div>
            </div>
          ) : (
            resources.map((resource, rowIdx) => {
              const resourceEvents = eventsByResource.get(resource.resourceId) || []
              
              return (
                <div
                  key={resource.resourceId}
                  className="flex border-b border-gray-200 min-h-[80px]"
                >
                  {/* Ressourcen-Name - Sticky Left */}
                  <div 
                    style={{ width: `${RESOURCE_WIDTH}px`, minWidth: `${RESOURCE_WIDTH}px` }}
                    className={`
                      flex-shrink-0 sticky left-0 z-40
                      border-r-2 border-gray-300 px-4 py-3 shadow-sm
                      ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    `}
                  >
                    <div className="flex items-center gap-3 h-full">
                      {resource.type === 'employee' ? (
                        <>
                          {resource.profilbildUrl ? (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={resource.profilbildUrl} />
                              <AvatarFallback className="text-xs">
                                {resource.vorname?.[0]}{resource.nachname?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                              {resource.vorname?.[0]}{resource.nachname?.[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {resource.resourceTitle}
                            </p>
                            {resource.availability && !resource.availability.available && (
                              <p className="text-xs text-red-600 truncate">
                                {resource.availability.reason === 'vacation' ? '🏖️ Urlaub' :
                                 resource.availability.reason === 'sick' ? '🤒 Krank' : '⚠️ Nicht verfügbar'}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-green-100 flex items-center justify-center">
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
                  </div>
                  
                  {/* Timeline-Zellen */}
                  {days.map((day, dayIdx) => {
                    const dayEvents = resourceEvents.filter(e => isEventOnDay(e, day))
                    
                    return (
                      <div
                        key={dayIdx}
                        style={{ width: `${DAY_WIDTH}px`, minWidth: `${DAY_WIDTH}px` }}
                        className={`
                          flex-shrink-0 border-r border-gray-200 p-2
                          cursor-pointer hover:bg-blue-50 transition-colors
                          ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          ${dragOverCell?.resourceId === resource.resourceId && 
                            isSameDay(dragOverCell.day, day) ? 'bg-blue-100 ring-2 ring-blue-400' : ''}
                        `}
                        onClick={() => onSlotClick && onSlotClick(resource.resourceId, day)}
                        onDragOver={(e) => handleDragOver(e, resource.resourceId, day)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, resource.resourceId, day)}
                      >
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            draggable={event.sourceType !== 'urlaub'}
                            onDragStart={(e) => handleDragStart(e, event)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEventClick && onEventClick(event)
                            }}
                            className={`
                              text-xs px-2 py-1.5 mb-1.5 rounded-md shadow
                              hover:shadow-lg transition-all font-medium relative group
                              ${event.sourceType === 'urlaub' 
                                ? 'bg-gray-200 text-gray-800 border-l-4 border-gray-500 cursor-default'
                                : event.hasConflict
                                ? 'bg-red-50 text-red-900 border-l-4 border-red-600 ring-1 ring-red-200 cursor-move'
                                : event.bestaetigt
                                ? 'bg-green-500 text-white border-l-4 border-green-700 cursor-move'
                                : 'bg-blue-500 text-white border-l-4 border-blue-700 cursor-move'
                              }
                              ${draggedEvent?.id === event.id ? 'opacity-50' : ''}
                            `}
                            style={{
                              backgroundColor: event.color && event.sourceType !== 'urlaub' ? event.color : undefined
                            }}
                            title={`${event.title}\n${format(event.start, 'HH:mm', { locale: de })} - ${format(event.end, 'HH:mm', { locale: de })}\n${event.sourceType === 'urlaub' ? '' : 'Drag & Drop zum Verschieben'}`}
                          >
                            <div className="flex items-center gap-1 justify-between">
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                {event.hasConflict && <span className="text-red-600 flex-shrink-0">⚠️</span>}
                                <span className="truncate">{event.title}</span>
                              </div>
                              {event.sourceType !== 'urlaub' && (
                                <button
                                  onClick={(e) => handleDelete(e, event)}
                                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-600 rounded"
                                  title="Einsatz löschen"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
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
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
