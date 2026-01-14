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
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { PlantafelEvent, PlantafelResource, DateRange } from './types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUpdateAssignment, useDeleteAssignment } from '@/lib/queries/plantafelQueries'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface TimelineViewProps {
  resources: PlantafelResource[]
  events: PlantafelEvent[]
  dateRange: DateRange
  view: 'team' | 'project'
  onEventClick?: (event: PlantafelEvent) => void
  onSlotClick?: (resourceId: string, date: Date) => void
}

// Feste Breiten in Pixeln für perfekte Ausrichtung
const RESOURCE_WIDTH = 320 // px - Erhöht für vollständige Projektinformationen
const DAY_WIDTH = 180 // px

export default function TimelineView({
  resources,
  events,
  dateRange,
  view,
  onEventClick,
  onSlotClick
}: TimelineViewProps) {
  const [draggedEvent, setDraggedEvent] = useState<PlantafelEvent | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{ resourceId: string; day: Date } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<PlantafelEvent | null>(null)
  
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
      // Setze die Zielzeit auf den Anfang des Tages und behalte die Original-Stunden bei
      const originalStartHour = draggedEvent.start.getHours()
      const originalStartMinute = draggedEvent.start.getMinutes()
      const originalEndHour = draggedEvent.end.getHours()
      const originalEndMinute = draggedEvent.end.getMinutes()
      
      // Neue Daten mit gleicher Uhrzeit
      const newStart = new Date(targetDay)
      newStart.setHours(originalStartHour, originalStartMinute, 0, 0)
      
      const newEnd = new Date(targetDay)
      newEnd.setHours(originalEndHour, originalEndMinute, 0, 0)
      
      // Wenn End vor Start, dann am nächsten Tag
      if (newEnd <= newStart) {
        newEnd.setDate(newEnd.getDate() + 1)
      }
      
      // Update-Daten zusammenstellen
      const updateData: any = {
        von: newStart.toISOString(),
        bis: newEnd.toISOString(),
      }
      
      // Ressource nur ändern wenn verschieden und je nach View
      if (targetResourceId !== draggedEvent.resourceId) {
        if (view === 'team') {
          updateData.mitarbeiterId = targetResourceId
        } else if (view === 'project') {
          updateData.projektId = targetResourceId
        }
      }
      
      await updateMutation.mutateAsync({
        id: draggedEvent.sourceId,
        data: updateData
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
  
  // Löschen Dialog öffnen
  const handleDeleteClick = (e: React.MouseEvent, event: PlantafelEvent) => {
    e.stopPropagation()
    
    if (event.sourceType === 'urlaub') {
      toast.error('Abwesenheiten können hier nicht gelöscht werden')
      return
    }
    
    setEventToDelete(event)
    setDeleteDialogOpen(true)
  }
  
  // Löschen bestätigen
  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return
    
    try {
      await deleteMutation.mutateAsync(eventToDelete.sourceId)
      toast.success('Einsatz erfolgreich gelöscht')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Löschen'
      toast.error(errorMessage)
    } finally {
      setDeleteDialogOpen(false)
      setEventToDelete(null)
    }
  }
  
  // Berechne Gesamtbreite
  const totalWidth = RESOURCE_WIDTH + (days.length * DAY_WIDTH)
  
  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Scrollbarer Container */}
      <div className="flex-1 overflow-auto w-full">
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
                            <p className="text-sm font-medium text-gray-900 break-words">
                              {resource.resourceTitle}
                            </p>
                            {/* Vollständige Adresse anzeigen */}
                            {(resource.adresse || resource.plz || resource.ort) && (
                              <p className="text-xs text-gray-600 break-words mt-0.5">
                                {[
                                  resource.adresse,
                                  resource.plz && resource.ort 
                                    ? `${resource.plz} ${resource.ort}`
                                    : resource.plz || resource.ort
                                ].filter(Boolean).join(', ')}
                              </p>
                            )}
                            {resource.kundeName && (
                              <p className="text-xs text-gray-500 break-words mt-0.5">{resource.kundeName}</p>
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
                                  onClick={(e) => handleDeleteClick(e, event)}
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
      
      {/* Modern Lösch-Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-gray-900">
              Einsatz löschen
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-center text-gray-600">
                {eventToDelete && (
                  <div className="space-y-2 mt-2">
                    <span className="block">Möchten Sie diesen Einsatz wirklich löschen?</span>
                    <div className="bg-gray-50 rounded-lg p-3 mt-3 text-left">
                      <span className="block font-medium text-gray-900">{eventToDelete.title}</span>
                      <span className="block text-sm text-gray-500 mt-1">
                        {format(eventToDelete.start, 'dd.MM.yyyy', { locale: de })}
                        {!isSameDay(eventToDelete.start, eventToDelete.end) && (
                          <> - {format(eventToDelete.end, 'dd.MM.yyyy', { locale: de })}</>
                        )}
                      </span>
                      <span className="block text-sm text-gray-500">
                        {format(eventToDelete.start, 'HH:mm')} - {format(eventToDelete.end, 'HH:mm')} Uhr
                      </span>
                    </div>
                    <span className="text-sm text-amber-600 flex items-center justify-center gap-1 mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      Diese Aktion kann nicht rückgängig gemacht werden.
                    </span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel 
              className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-0"
              onClick={() => setEventToDelete(null)}
            >
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Löschen...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Endgültig löschen
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
