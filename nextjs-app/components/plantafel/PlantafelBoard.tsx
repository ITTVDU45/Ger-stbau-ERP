'use client'

/**
 * PlantafelBoard
 * 
 * Haupt-Container für die Plantafel mit React Big Calendar.
 * Orchestriert: Toolbar, Kalender, Dialog, Conflict Panel
 */

import { useMemo, useCallback, useState, useRef } from 'react'
import { Calendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar'
import withDragAndDrop, { withDragAndDropProps, EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, subDays, addDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'

// Styles
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import '@/styles/plantafel.css'

// Components
import PlantafelToolbar from './PlantafelToolbar'
import AssignmentDialog from './AssignmentDialog'
import ConflictPanel from './ConflictPanel'
import TimelineView from './TimelineView'
import ProjektSidebar, { DraggedProject } from './ProjektSidebar'

// State & Queries
import { usePlantafelStore } from '@/lib/stores/plantafelStore'
import { useAssignments, useUpdateAssignment, useCreateAssignment } from '@/lib/queries/plantafelQueries'

// Types
import { PlantafelEvent, PlantafelResource } from './types'

// ============================================================================
// DATE-FNS LOCALIZER
// ============================================================================

const locales = { de }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

// Deutsche Formate für Kalender-Header
const formats = {
  dayFormat: (date: Date, culture: string | undefined, localizer: any) =>
    localizer.format(date, 'EEE dd.MM.', culture),
  dayHeaderFormat: (date: Date, culture: string | undefined, localizer: any) =>
    localizer.format(date, 'EEEE, dd. MMMM', culture),
  dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }, culture: string | undefined, localizer: any) =>
    `${localizer.format(start, 'dd.MM.', culture)} – ${localizer.format(end, 'dd.MM.yyyy', culture)}`,
  weekdayFormat: (date: Date, culture: string | undefined, localizer: any) =>
    localizer.format(date, 'EEE', culture),
  monthHeaderFormat: (date: Date, culture: string | undefined, localizer: any) =>
    localizer.format(date, 'MMMM yyyy', culture),
  timeGutterFormat: (date: Date, culture: string | undefined, localizer: any) =>
    localizer.format(date, 'HH:mm', culture),
  eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }, culture: string | undefined, localizer: any) =>
    `${localizer.format(start, 'HH:mm', culture)} – ${localizer.format(end, 'HH:mm', culture)}`,
}

// ============================================================================
// DRAG & DROP CALENDAR
// ============================================================================

const DnDCalendar = withDragAndDrop<PlantafelEvent, PlantafelResource>(Calendar)

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PlantafelBoard() {
  // State
  const {
    view,
    calendarView,
    dateRange,
    currentDate,
    filters,
    searchTerm,
    openCreateDialog,
    openEditDialog,
    setCurrentDate,
    sidebarMode
  } = usePlantafelStore()
  
  // Erweiterter Datumsbereich für die Monatsansicht
  // (enthält auch Tage aus benachbarten Monaten die im Kalender sichtbar sind)
  const effectiveDateRange = useMemo(() => {
    if (calendarView === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      // Erweitere um 7 Tage in beide Richtungen für sichtbare Randzellen
      return {
        start: subDays(monthStart, 7),
        end: addDays(monthEnd, 7)
      }
    }
    return dateRange
  }, [calendarView, currentDate, dateRange])
  
  // Queries - verwende effektiven Bereich für Monatsansicht
  const { data, isLoading, error } = useAssignments(effectiveDateRange, view, filters)
  const updateMutation = useUpdateAssignment()
  const createMutation = useCreateAssignment()
  
  // Drag-Over State für externen Drop
  const [isDragOver, setIsDragOver] = useState(false)
  
  // Gefilterte Events basierend auf Suchbegriff
  // (Gruppierung wird jetzt von der API übernommen)
  const filteredEvents = useMemo(() => {
    if (!data?.events?.length) return []
    
    if (!searchTerm) return data.events
    
    const term = searchTerm.toLowerCase()
    return data.events.filter(event => 
      event.title.toLowerCase().includes(term) ||
      event.mitarbeiterName?.toLowerCase().includes(term) ||
      event.projektName?.toLowerCase().includes(term)
    )
  }, [data?.events, searchTerm])
  
  // Konflikte
  const conflicts = data?.conflicts || []
  
  // Resources
  const resources = data?.resources || []
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * Event Klick -> Öffne Edit Dialog
   */
  const handleSelectEvent = useCallback((event: PlantafelEvent) => {
    // Nur Einsätze können bearbeitet werden, nicht Urlaube
    if (event.sourceType === 'urlaub') {
      toast.info('Abwesenheiten können in der Mitarbeiterverwaltung bearbeitet werden')
      return
    }
    openEditDialog(event)
  }, [openEditDialog])
  
  /**
   * Slot Auswahl -> Öffne Create Dialog
   */
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    const slot = {
      start: slotInfo.start,
      end: slotInfo.end,
      resourceId: (slotInfo as any).resourceId || ''
    }
    openCreateDialog(slot)
  }, [openCreateDialog])
  
  /**
   * Event Drag & Drop
   */
  const handleEventDrop = useCallback(
    async ({ event, start, end, resourceId }: EventInteractionArgs<PlantafelEvent>) => {
      // Nur Einsätze können verschoben werden
      if (event.sourceType === 'urlaub') {
        toast.error('Abwesenheiten können nicht verschoben werden')
        return
      }
      
      // Stelle sicher dass wir eine gültige Source-ID haben
      const einsatzId = event.sourceId
      if (!einsatzId) {
        console.error('[Plantafel] Keine gültige sourceId gefunden:', event)
        toast.error('Einsatz kann nicht verschoben werden (keine ID)')
        return
      }
      
      // Berechne das neue Datum basierend auf dem Typ (Aufbau/Abbau)
      const isAufbau = event.id.includes('-setup') || event.setupDate
      const isAbbau = event.id.includes('-dismantle') || event.dismantleDate
      const newDateStr = format(start as Date, 'yyyy-MM-dd')
      
      try {
        await updateMutation.mutateAsync({
          id: einsatzId,
          data: {
            von: (start as Date).toISOString(),
            bis: (end as Date).toISOString(),
            // Aktualisiere auch das date-only Feld wenn es ein Aufbau/Abbau Event ist
            ...(isAufbau && { setupDate: newDateStr }),
            ...(isAbbau && { dismantleDate: newDateStr }),
            // Bei Resource-Änderung: Je nach View Mitarbeiter oder Projekt aktualisieren
            ...(resourceId && view === 'team' && { mitarbeiterId: resourceId as string }),
            ...(resourceId && view === 'project' && { projektId: resourceId as string })
          }
        })
        toast.success('Einsatz verschoben')
      } catch (error: any) {
        console.error('[Plantafel] Fehler beim Verschieben:', error)
        toast.error(error.message || 'Fehler beim Verschieben')
      }
    },
    [updateMutation, view]
  )
  
  /**
   * Event Resize
   */
  const handleEventResize = useCallback(
    async ({ event, start, end }: EventInteractionArgs<PlantafelEvent>) => {
      // Nur Einsätze können verändert werden
      if (event.sourceType === 'urlaub') {
        toast.error('Abwesenheiten können nicht verändert werden')
        return
      }
      
      try {
        await updateMutation.mutateAsync({
          id: event.sourceId,
          data: {
            von: (start as Date).toISOString(),
            bis: (end as Date).toISOString()
          }
        })
        toast.success('Einsatz angepasst')
      } catch (error: any) {
        toast.error(error.message || 'Fehler beim Anpassen')
      }
    },
    [updateMutation]
  )
  
  /**
   * Navigation
   */
  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
  }, [setCurrentDate])
  
  /**
   * Externe Drag & Drop Handler (für Projekte aus der Sidebar)
   */
  const handleExternalDragOver = useCallback((e: React.DragEvent) => {
    // Nur akzeptieren wenn Daten vorhanden sind
    if (e.dataTransfer.types.includes('application/json')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setIsDragOver(true)
    }
  }, [])
  
  const handleExternalDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])
  
  const handleExternalDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const jsonData = e.dataTransfer.getData('application/json')
    if (!jsonData) return
    
    try {
      const projektData: DraggedProject = JSON.parse(jsonData)
      
      // Versuche das Datum aus dem Drop-Ziel zu ermitteln (für Monatsansicht)
      let targetDate = currentDate
      
      // Suche nach der nächsten Zelle mit einem Datum
      const target = e.target as HTMLElement
      const dateCell = target.closest('.rbc-date-cell, .rbc-day-bg') as HTMLElement
      
      if (dateCell) {
        // Versuche das Datum aus dem data-date Attribut zu lesen
        const dateAttr = dateCell.getAttribute('data-date')
        if (dateAttr) {
          targetDate = new Date(dateAttr)
        } else {
          // Alternativ: Finde das Datum aus der Zellenposition
          const allDateCells = document.querySelectorAll('.rbc-date-cell')
          const allDayBgCells = document.querySelectorAll('.rbc-day-bg')
          
          // Suche nach der entsprechenden day-bg Zelle
          let cellIndex = -1
          allDayBgCells.forEach((cell, idx) => {
            if (cell === dateCell || cell.contains(target)) {
              cellIndex = idx
            }
          })
          
          // Falls wir die Position haben, berechne das Datum
          if (cellIndex >= 0 && allDateCells.length > 0) {
            // Die erste Zelle im Monat könnte vom Vormonat sein
            const firstDateCellContent = allDateCells[cellIndex]?.textContent
            if (firstDateCellContent) {
              const day = parseInt(firstDateCellContent)
              if (!isNaN(day)) {
                const newDate = new Date(currentDate)
                newDate.setDate(day)
                targetDate = newDate
              }
            }
          }
        }
      }
      
      const startDate = new Date(targetDate)
      startDate.setHours(8, 0, 0, 0)
      
      const endDate = new Date(targetDate)
      endDate.setHours(17, 0, 0, 0)
      
      await createMutation.mutateAsync({
        projektId: projektData.projektId,
        von: startDate.toISOString(),
        bis: endDate.toISOString(),
        ...(projektData.typ === 'aufbau' && { setupDate: format(targetDate, 'yyyy-MM-dd') }),
        ...(projektData.typ === 'abbau' && { dismantleDate: format(targetDate, 'yyyy-MM-dd') }),
        notizen: `${projektData.typ === 'aufbau' ? 'Aufbau' : 'Abbau'} - ${projektData.projektName}`
      })
      
      toast.success(`${projektData.typ === 'aufbau' ? 'Aufbau' : 'Abbau'} für "${projektData.projektName}" am ${format(targetDate, 'dd.MM.yyyy')} erstellt`)
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Erstellen des Einsatzes')
    }
  }, [currentDate, createMutation])
  
  // ============================================================================
  // CUSTOM COMPONENTS
  // ============================================================================
  
  /**
   * Custom Event Renderer
   */
  const eventPropGetter = useCallback((event: PlantafelEvent) => {
    const classNames: string[] = []
    const style: React.CSSProperties = {}
    
    // Basis-Klasse nach Typ
    if (event.sourceType === 'urlaub') {
      classNames.push(`plantafel-event-${event.urlaubTyp || 'urlaub'}`)
    } else {
      // Prüfe ob Aufbau oder Abbau
      const title = (event.title || '').toLowerCase()
      const notes = (event.notes || '').toLowerCase()
      const isAufbau = event.setupDate || title.includes('aufbau') || notes.includes('aufbau') || event.id.includes('-setup')
      const isAbbau = event.dismantleDate || title.includes('abbau') || notes.includes('abbau') || event.id.includes('-dismantle')
      
      if (isAufbau) {
        classNames.push('plantafel-event-aufbau')
      } else if (isAbbau) {
        classNames.push('plantafel-event-abbau')
      } else {
        classNames.push('plantafel-event-einsatz')
        if (event.bestaetigt) {
          classNames.push('bestaetigt')
        }
      }
    }
    
    // Konflikt-Markierung
    if (event.hasConflict) {
      classNames.push('plantafel-event-conflict')
    }
    
    return {
      className: classNames.join(' '),
      style
    }
  }, [])
  
  /**
   * Custom Resource Header
   */
  const resourceHeader = useCallback(({ resource }: { resource: PlantafelResource }) => (
    <div className="flex items-center gap-2 py-1">
      {resource.type === 'employee' ? (
        <>
          {resource.profilbildUrl ? (
            <img 
              src={resource.profilbildUrl} 
              alt="" 
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
              {resource.vorname?.[0]}{resource.nachname?.[0]}
            </div>
          )}
          <span className="truncate">{resource.resourceTitle}</span>
          {resource.availability && !resource.availability.available && (
            <span 
              className="ml-auto text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700"
              title={resource.availability.details}
            >
              {resource.availability.reason === 'vacation' ? '🏖️' : 
               resource.availability.reason === 'sick' ? '🤒' : 
               resource.availability.reason === 'booked' ? '📅' : '⚠️'}
            </span>
          )}
        </>
      ) : (
        <>
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: '#3b82f6' }}
          />
          <span className="truncate">{resource.resourceTitle}</span>
          {resource.status && (
            <span className="ml-auto text-xs text-gray-500">
              {resource.status === 'aktiv' ? '🟢' : '🟡'}
            </span>
          )}
        </>
      )}
    </div>
  ), [])
  
  // ============================================================================
  // CUSTOM DATE CELL WRAPPER (für Drop auf einzelne Tage in Monatsansicht)
  // ============================================================================
  
  const DateCellWrapper = useCallback(({ children, value }: { children: React.ReactNode, value: Date }) => {
    const [isOver, setIsOver] = useState(false)
    
    const handleDragOver = (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('application/json')) {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
        setIsOver(true)
      }
    }
    
    const handleDragLeave = (e: React.DragEvent) => {
      e.stopPropagation()
      setIsOver(false)
    }
    
    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsOver(false)
      
      const jsonData = e.dataTransfer.getData('application/json')
      if (!jsonData) return
      
      try {
        const projektData: DraggedProject = JSON.parse(jsonData)
        
        const startDate = new Date(value)
        startDate.setHours(8, 0, 0, 0)
        
        const endDate = new Date(value)
        endDate.setHours(17, 0, 0, 0)
        
        await createMutation.mutateAsync({
          projektId: projektData.projektId,
          von: startDate.toISOString(),
          bis: endDate.toISOString(),
          ...(projektData.typ === 'aufbau' && { setupDate: format(value, 'yyyy-MM-dd') }),
          ...(projektData.typ === 'abbau' && { dismantleDate: format(value, 'yyyy-MM-dd') }),
          notizen: `${projektData.typ === 'aufbau' ? 'Aufbau' : 'Abbau'} - ${projektData.projektName}`
        })
        
        toast.success(`${projektData.typ === 'aufbau' ? 'Aufbau' : 'Abbau'} für "${projektData.projektName}" am ${format(value, 'dd.MM.yyyy')} erstellt`)
      } catch (error: any) {
        toast.error(error.message || 'Fehler beim Erstellen')
      }
    }
    
    return (
      <div 
        className={`rbc-day-bg-wrapper h-full w-full ${isOver ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ minHeight: '100%' }}
      >
        {children}
      </div>
    )
  }, [createMutation])
  
  // ============================================================================
  // VIEW MAPPING
  // ============================================================================
  
  const rbcView: View = useMemo(() => {
    switch (calendarView) {
      case 'day': return 'day'
      case 'month': return 'month'
      case 'week':
      default: return 'week'
    }
  }, [calendarView])
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="flex flex-col h-full min-h-[600px] w-full bg-white text-gray-900">
      {/* Toolbar */}
      <PlantafelToolbar 
        conflictCount={conflicts.length}
        onCreateClick={() => openCreateDialog()}
      />
      
      {/* Main Content */}
      <div className="flex flex-1 min-h-0 w-full">
        {/* Calendar */}
        <div className="flex-1 overflow-auto px-0 py-4 bg-white min-w-0 w-full">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow">
                <p className="text-red-500 mb-4">Fehler beim Laden der Daten</p>
                <p className="text-gray-500 text-sm">{(error as Error).message}</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-500">Lade Plantafel...</p>
              </div>
            </div>
          ) : calendarView === 'week' || calendarView === 'day' ? (
            <TimelineView
              resources={resources}
              events={filteredEvents}
              dateRange={dateRange}
              view={view}
              onEventClick={handleSelectEvent}
              onSlotClick={(resourceId, date) => {
                const slot = {
                  start: date,
                  end: new Date(date.getTime() + 8 * 60 * 60 * 1000), // 8 Stunden später
                  resourceId
                }
                openCreateDialog(slot)
              }}
            />
          ) : (
            <DnDCalendar
              localizer={localizer}
              events={filteredEvents}
              resources={resources.length > 0 ? resources : undefined}
              resourceIdAccessor="resourceId"
              resourceTitleAccessor="resourceTitle"
              
              view={rbcView}
              date={currentDate}
              onNavigate={handleNavigate}
              
              selectable
              resizable
              
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              
              eventPropGetter={eventPropGetter}
              
              components={{
                resourceHeader,
                dateCellWrapper: DateCellWrapper
              }}
              
              // Deutsche Datumsformate
              formats={formats}
              culture="de"
              
              // Arbeitszeit-Bereich
              min={new Date(0, 0, 0, 7, 0, 0)} // 07:00
              max={new Date(0, 0, 0, 18, 0, 0)} // 18:00
              
              // Lokalisierung
              messages={{
                today: 'Heute',
                previous: 'Zurück',
                next: 'Weiter',
                month: 'Monat',
                week: 'Woche',
                day: 'Tag',
                agenda: 'Agenda',
                date: 'Datum',
                time: 'Zeit',
                event: 'Ereignis',
                allDay: 'Ganztägig',
                noEventsInRange: 'Keine Ereignisse in diesem Zeitraum',
                showMore: (count) => `+ ${count} weitere`
              }}
              
              // Zeit-Slot Einstellungen
              step={30}
              timeslots={2}
              
              // Popup für "+X weitere" in Monatsansicht
              popup
              popupOffset={{ x: 0, y: -10 }}
              
              // Drag & Drop
              draggableAccessor={() => true}
              resizableAccessor={(event) => event.sourceType === 'einsatz'}
              
              style={{ height: '100%', width: '100%' }}
            />
          )}
        </div>
        
        {/* Sidebar: Konflikte oder Projekte */}
        {sidebarMode === 'conflicts' ? (
          <ConflictPanel conflicts={conflicts} isLoading={isLoading} />
        ) : (
          <ProjektSidebar />
        )}
      </div>
      
      {/* Assignment Dialog */}
      <AssignmentDialog />
    </div>
  )
}
