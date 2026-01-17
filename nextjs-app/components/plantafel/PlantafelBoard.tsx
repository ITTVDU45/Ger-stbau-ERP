'use client'

/**
 * PlantafelBoard
 * 
 * Haupt-Container für die Plantafel mit React Big Calendar.
 * Orchestriert: Toolbar, Kalender, Dialog, Conflict Panel
 */

import { useMemo, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar'
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
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

// State & Queries
import { usePlantafelStore } from '@/lib/stores/plantafelStore'
import { useAssignments, useUpdateAssignment } from '@/lib/queries/plantafelQueries'

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
    setCurrentDate
  } = usePlantafelStore()
  
  // Queries
  const { data, isLoading, error } = useAssignments(dateRange, view, filters)
  const updateMutation = useUpdateAssignment()
  
  // Gefilterte Events basierend auf Suchbegriff
  const filteredEvents = useMemo(() => {
    if (!data?.events) return []
    
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
  const handleEventDrop: withDragAndDropProps<PlantafelEvent, PlantafelResource>['onEventDrop'] = useCallback(
    async ({ event, start, end, resourceId }) => {
      // Nur Einsätze können verschoben werden
      if (event.sourceType === 'urlaub') {
        toast.error('Abwesenheiten können nicht verschoben werden')
        return
      }
      
      try {
        await updateMutation.mutateAsync({
          id: event.sourceId,
          data: {
            von: (start as Date).toISOString(),
            bis: (end as Date).toISOString(),
            // Bei Resource-Änderung: Je nach View Mitarbeiter oder Projekt aktualisieren
            ...(resourceId && view === 'team' && { mitarbeiterId: resourceId as string }),
            ...(resourceId && view === 'project' && { projektId: resourceId as string })
          }
        })
        toast.success('Einsatz verschoben')
      } catch (error: any) {
        toast.error(error.message || 'Fehler beim Verschieben')
      }
    },
    [updateMutation, view]
  )
  
  /**
   * Event Resize
   */
  const handleEventResize: withDragAndDropProps<PlantafelEvent, PlantafelResource>['onEventResize'] = useCallback(
    async ({ event, start, end }) => {
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
      classNames.push('plantafel-event-einsatz')
      if (event.bestaetigt) {
        classNames.push('bestaetigt')
      }
    }
    
    // Konflikt-Markierung
    if (event.hasConflict) {
      classNames.push('plantafel-event-conflict')
    }
    
    // Projekt-Farbe (falls vorhanden)
    if (event.color && event.sourceType !== 'urlaub') {
      style.backgroundColor = event.color
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
                resourceHeader
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
        
        {/* Conflict Panel */}
        <ConflictPanel conflicts={conflicts} isLoading={isLoading} />
      </div>
      
      {/* Assignment Dialog */}
      <AssignmentDialog />
    </div>
  )
}
