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
import { DraggedProject } from './ProjektSidebar'
// Avatar nicht mehr benötigt da keine Ressourcen-Spalte mehr
import { useUpdateAssignment, useDeleteAssignment, useCreateAssignment } from '@/lib/queries/plantafelQueries'
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
const DAY_WIDTH = 220 // px - Breitere Spalten ohne Ressourcen-Spalte

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
  const createMutation = useCreateAssignment()
  
  // Prüfe ob Event an einem Tag aktiv ist
  const isEventOnDay = (event: PlantafelEvent, day: Date): boolean => {
    return isWithinInterval(day, { start: event.start, end: event.end }) ||
           isSameDay(event.start, day) ||
           isSameDay(event.end, day)
  }
  
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
  
  // Events nach Tag gruppieren (keine Ressourcen-Gruppierung mehr)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, PlantafelEvent[]>()
    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      map.set(dayKey, [])
    })
    events.forEach(event => {
      days.forEach(day => {
        if (isEventOnDay(event, day)) {
          const dayKey = format(day, 'yyyy-MM-dd')
          const existing = map.get(dayKey) || []
          // Duplikate vermeiden
          if (!existing.find(e => e.id === event.id)) {
            map.set(dayKey, [...existing, event])
          }
        }
      })
    })
    return map
  }, [events, days])
  
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
    // Externe Drops (von ProjektSidebar) haben 'copy' als effectAllowed
    e.dataTransfer.dropEffect = draggedEvent ? 'move' : 'copy'
    setDragOverCell({ resourceId, day })
  }
  
  const handleDragLeave = () => {
    setDragOverCell(null)
  }
  
  const handleDrop = async (e: React.DragEvent, targetResourceId: string, targetDay: Date) => {
    e.preventDefault()
    setDragOverCell(null)
    
    // Prüfe ob externes Projekt gedroppt wurde
    const jsonData = e.dataTransfer.getData('application/json')
    if (jsonData && !draggedEvent) {
      try {
        const projektData: DraggedProject = JSON.parse(jsonData)
        
        // Neuen Einsatz erstellen
        const startDate = new Date(targetDay)
        startDate.setHours(8, 0, 0, 0)
        
        const endDate = new Date(targetDay)
        endDate.setHours(17, 0, 0, 0)
        
        await createMutation.mutateAsync({
          projektId: projektData.projektId,
          von: startDate.toISOString(),
          bis: endDate.toISOString(),
          // Je nach View und Typ
          ...(view === 'team' && { mitarbeiterId: targetResourceId }),
          ...(projektData.typ === 'aufbau' && { setupDate: format(targetDay, 'yyyy-MM-dd') }),
          ...(projektData.typ === 'abbau' && { dismantleDate: format(targetDay, 'yyyy-MM-dd') }),
          notizen: `${projektData.typ === 'aufbau' ? 'Aufbau' : 'Abbau'} - ${projektData.projektName}`
        })
        
        toast.success(`${projektData.typ === 'aufbau' ? 'Aufbau' : 'Abbau'} für "${projektData.projektName}" erstellt`)
        return
      } catch (error: any) {
        toast.error(error.message || 'Fehler beim Erstellen des Einsatzes')
        return
      }
    }
    
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
  
  // Berechne Gesamtbreite - volle Breite ohne Ressourcen-Spalte
  const totalWidth = days.length * DAY_WIDTH
  
  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Scrollbarer Container */}
      <div className="flex-1 overflow-auto w-full">
        {/* Content mit fester Breite oder voller Breite */}
        <div className="min-w-full" style={{ minWidth: `${totalWidth}px` }}>
          
          {/* HEADER ROW - Sticky */}
          <div className="flex sticky top-0 z-50 bg-white border-b-2 border-gray-300 shadow-md">
            {/* Tage-Header - gleichmäßig verteilt */}
            {days.map((day, idx) => (
              <div
                key={idx}
                className="flex-1 border-r border-gray-200 bg-gray-50 px-3 py-3 text-center"
                style={{ minWidth: `${DAY_WIDTH}px` }}
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
          
          {/* BODY - Tages-Spalten mit Events */}
          <div className="flex min-h-[500px]">
            {days.map((day, dayIdx) => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const dayEvents = eventsByDay.get(dayKey) || []
              const isToday = isSameDay(day, new Date())
              
              return (
                <div
                  key={dayIdx}
                  className={`
                    flex-1 border-r border-gray-200 p-2
                    cursor-pointer hover:bg-blue-50/50 transition-colors
                    ${isToday ? 'bg-blue-50/30' : dayIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                    ${dragOverCell && isSameDay(dragOverCell.day, day) ? 'bg-blue-100 ring-2 ring-blue-400' : ''}
                  `}
                  style={{ minWidth: `${DAY_WIDTH}px` }}
                  onClick={() => onSlotClick && onSlotClick('', day)}
                  onDragOver={(e) => handleDragOver(e, '', day)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, '', day)}
                >
                  {/* Events für diesen Tag */}
                  <div className="space-y-2">
                    {dayEvents.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-xs">
                        Keine Termine
                      </div>
                    ) : (
                      dayEvents.map((event) => {
                        // Bestimme Farbe basierend auf Aufbau/Abbau
                        const title = (event.title || '').toLowerCase()
                        const notes = (event.notes || '').toLowerCase()
                        const isAufbau = event.setupDate || event.id.includes('-setup') || title.includes('aufbau') || notes.includes('aufbau')
                        const isAbbau = event.dismantleDate || event.id.includes('-dismantle') || title.includes('abbau') || notes.includes('abbau')
                        
                        // Bestimme die CSS-Klassen für Farben
                        let colorClasses = 'bg-slate-600 text-white border-l-4 border-slate-800 cursor-move' // Standard-Fallback
                        
                        if (event.sourceType === 'urlaub') {
                          colorClasses = 'bg-orange-100 text-orange-800 border-l-4 border-orange-500 cursor-default'
                        } else if (event.hasConflict) {
                          colorClasses = 'bg-red-50 text-red-900 border-l-4 border-red-600 ring-1 ring-red-200 cursor-move'
                        } else if (isAufbau) {
                          colorClasses = 'bg-blue-500 text-white border-l-4 border-blue-700 cursor-move'
                        } else if (isAbbau) {
                          colorClasses = 'bg-green-500 text-white border-l-4 border-green-700 cursor-move'
                        } else if (event.bestaetigt) {
                          colorClasses = 'bg-emerald-500 text-white border-l-4 border-emerald-700 cursor-move'
                        }
                        
                        return (
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
                              text-xs px-3 py-2 rounded-lg shadow-sm
                              hover:shadow-md transition-all font-medium relative group
                              ${colorClasses}
                              ${draggedEvent?.id === event.id ? 'opacity-50' : ''}
                            `}
                            title={`${event.title}\n${format(event.start, 'HH:mm', { locale: de })} - ${format(event.end, 'HH:mm', { locale: de })}\n${event.sourceType === 'urlaub' ? '' : 'Drag & Drop zum Verschieben'}`}
                          >
                            <div className="flex items-center gap-1 justify-between">
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                {event.hasConflict && <span className="flex-shrink-0">⚠️</span>}
                                <span className="font-semibold truncate">{event.title}</span>
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
                            {/* Projekt/Adresse-Info */}
                            {(event.projektAdresse || event.projektName) && (
                              <div className="text-[10px] opacity-90 mt-1">
                                📍 {event.projektAdresse || event.projektName}
                                {event.projektPlz && event.projektOrt && (
                                  <span>, {event.projektPlz} {event.projektOrt}</span>
                                )}
                              </div>
                            )}
                            {/* Mitarbeiter-Info */}
                            {event.mitarbeiterName && event.mitarbeiterName !== 'Nicht zugewiesen' && (
                              <div className="text-[10px] opacity-90 mt-0.5">
                                👤 {event.mitarbeiterName}
                              </div>
                            )}
                            {/* Uhrzeit */}
                            <div className="text-[10px] opacity-80 mt-1">
                              🕐 {format(event.start, 'HH:mm', { locale: de })} - {format(event.end, 'HH:mm', { locale: de })}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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
