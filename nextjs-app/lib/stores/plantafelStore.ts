/**
 * Zustand Store für die Plantafel
 * 
 * Verwaltet den lokalen UI-State:
 * - Aktive Ansicht (Team/Projekt)
 * - Sichtbarer Zeitraum
 * - Filter (Mitarbeiter, Projekte, Event-Typen)
 * - Ausgewählter Event (für Dialog)
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { PlantafelView, PlantafelFilters, PlantafelEvent, DateRange } from '@/components/plantafel/types'

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface PlantafelState {
  // Ansicht
  view: PlantafelView
  calendarView: 'week' | 'month' | 'day'
  
  // Zeitraum
  dateRange: DateRange
  currentDate: Date
  
  // Filter
  filters: PlantafelFilters
  searchTerm: string
  
  // Ausgewähltes Event (für Dialog)
  selectedEvent: PlantafelEvent | null
  isDialogOpen: boolean
  dialogMode: 'create' | 'edit'
  
  // Slot-Auswahl (für neuen Einsatz)
  selectedSlot: {
    start: Date
    end: Date
    resourceId: string
  } | null
  
  // Conflict Panel
  isConflictPanelOpen: boolean
  
  // Sidebar Mode (Konflikte oder Projekte)
  sidebarMode: 'conflicts' | 'projects'
  
  // Actions
  setView: (view: PlantafelView) => void
  setCalendarView: (view: 'week' | 'month' | 'day') => void
  setDateRange: (range: DateRange) => void
  setCurrentDate: (date: Date) => void
  
  // Navigation
  goToToday: () => void
  goToPrevious: () => void
  goToNext: () => void
  
  // Filter Actions
  setFilters: (filters: Partial<PlantafelFilters>) => void
  resetFilters: () => void
  setSearchTerm: (term: string) => void
  toggleEmployeeFilter: (employeeId: string) => void
  toggleProjectFilter: (projectId: string) => void
  
  // Dialog Actions
  openCreateDialog: (slot?: { start: Date; end: Date; resourceId: string }) => void
  openEditDialog: (event: PlantafelEvent) => void
  closeDialog: () => void
  
  // Conflict Panel
  toggleConflictPanel: () => void
  setConflictPanelOpen: (open: boolean) => void
  
  // Sidebar Mode
  setSidebarMode: (mode: 'conflicts' | 'projects') => void
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const getDefaultDateRange = (): DateRange => {
  const now = new Date()
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }), // Montag
    end: endOfWeek(now, { weekStartsOn: 1 }) // Sonntag
  }
}

const defaultFilters: PlantafelFilters = {
  employeeIds: [],
  projectIds: [],
  showAbsences: true,
  eventTypes: ['einsatz', 'urlaub', 'krankheit', 'sonderurlaub', 'unbezahlt', 'sonstiges']
}

// ============================================================================
// STORE CREATION
// ============================================================================

export const usePlantafelStore = create<PlantafelState>()(
  persist(
    (set, get) => ({
      // Initial State
      view: 'team',
      calendarView: 'week',
      dateRange: getDefaultDateRange(),
      currentDate: new Date(),
      filters: defaultFilters,
      searchTerm: '',
      selectedEvent: null,
      isDialogOpen: false,
      dialogMode: 'create',
      selectedSlot: null,
      isConflictPanelOpen: false,
      sidebarMode: 'projects',
      
      // View Actions
      setView: (view) => set({ view }),
      
      setCalendarView: (calendarView) => {
        const { currentDate } = get()
        let newRange: DateRange
        
        if (calendarView === 'week') {
          newRange = {
            start: startOfWeek(currentDate, { weekStartsOn: 1 }),
            end: endOfWeek(currentDate, { weekStartsOn: 1 })
          }
        } else if (calendarView === 'month') {
          newRange = {
            start: startOfMonth(currentDate),
            end: endOfMonth(currentDate)
          }
        } else {
          // day view - nur der aktuelle Tag
          const start = new Date(currentDate)
          start.setHours(0, 0, 0, 0)
          const end = new Date(currentDate)
          end.setHours(0, 0, 0, 0) // Gleicher Tag für Timeline
          newRange = { start, end }
        }
        
        set({ calendarView, dateRange: newRange })
      },
      
      setDateRange: (dateRange) => set({ dateRange }),
      
      setCurrentDate: (currentDate) => {
        const { calendarView } = get()
        let newRange: DateRange
        
        if (calendarView === 'week') {
          newRange = {
            start: startOfWeek(currentDate, { weekStartsOn: 1 }),
            end: endOfWeek(currentDate, { weekStartsOn: 1 })
          }
        } else if (calendarView === 'month') {
          newRange = {
            start: startOfMonth(currentDate),
            end: endOfMonth(currentDate)
          }
        } else {
          // day view - nur der aktuelle Tag
          const start = new Date(currentDate)
          start.setHours(0, 0, 0, 0)
          const end = new Date(currentDate)
          end.setHours(0, 0, 0, 0) // Gleicher Tag
          newRange = { start, end }
        }
        
        set({ currentDate, dateRange: newRange })
      },
      
      // Navigation Actions
      goToToday: () => {
        const now = new Date()
        get().setCurrentDate(now)
      },
      
      goToPrevious: () => {
        const { calendarView, currentDate } = get()
        let newDate: Date
        
        if (calendarView === 'week') {
          newDate = subWeeks(currentDate, 1)
        } else if (calendarView === 'month') {
          newDate = subMonths(currentDate, 1)
        } else {
          newDate = new Date(currentDate)
          newDate.setDate(newDate.getDate() - 1)
        }
        
        get().setCurrentDate(newDate)
      },
      
      goToNext: () => {
        const { calendarView, currentDate } = get()
        let newDate: Date
        
        if (calendarView === 'week') {
          newDate = addWeeks(currentDate, 1)
        } else if (calendarView === 'month') {
          newDate = addMonths(currentDate, 1)
        } else {
          newDate = new Date(currentDate)
          newDate.setDate(newDate.getDate() + 1)
        }
        
        get().setCurrentDate(newDate)
      },
      
      // Filter Actions
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),
      
      resetFilters: () => set({ filters: defaultFilters, searchTerm: '' }),
      
      setSearchTerm: (searchTerm) => set({ searchTerm }),
      
      toggleEmployeeFilter: (employeeId) => set((state) => {
        const currentIds = state.filters.employeeIds
        const newIds = currentIds.includes(employeeId)
          ? currentIds.filter(id => id !== employeeId)
          : [...currentIds, employeeId]
        
        return {
          filters: { ...state.filters, employeeIds: newIds }
        }
      }),
      
      toggleProjectFilter: (projectId) => set((state) => {
        const currentIds = state.filters.projectIds
        const newIds = currentIds.includes(projectId)
          ? currentIds.filter(id => id !== projectId)
          : [...currentIds, projectId]
        
        return {
          filters: { ...state.filters, projectIds: newIds }
        }
      }),
      
      // Dialog Actions
      openCreateDialog: (slot) => set({
        isDialogOpen: true,
        dialogMode: 'create',
        selectedEvent: null,
        selectedSlot: slot || null
      }),
      
      openEditDialog: (event) => set({
        isDialogOpen: true,
        dialogMode: 'edit',
        selectedEvent: event,
        selectedSlot: null
      }),
      
      closeDialog: () => set({
        isDialogOpen: false,
        selectedEvent: null,
        selectedSlot: null
      }),
      
      // Conflict Panel
      toggleConflictPanel: () => set((state) => ({
        isConflictPanelOpen: !state.isConflictPanelOpen
      })),
      
      setConflictPanelOpen: (open) => set({ isConflictPanelOpen: open }),
      
      // Sidebar Mode
      setSidebarMode: (mode) => set({ sidebarMode: mode, isConflictPanelOpen: mode === 'conflicts' })
    }),
    {
      name: 'plantafel-store',
      storage: createJSONStorage(() => localStorage),
      // Nur bestimmte Felder persistieren
      partialize: (state) => ({
        view: state.view,
        calendarView: state.calendarView,
        isConflictPanelOpen: state.isConflictPanelOpen,
        sidebarMode: state.sidebarMode,
        // Keine Datumsfelder persistieren - immer frisch starten
      }),
      // Datum-Strings korrekt parsen
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Nach Rehydration aktuelle Woche setzen
          const now = new Date()
          state.currentDate = now
          state.dateRange = getDefaultDateRange()
        }
      }
    }
  )
)

// ============================================================================
// SELECTORS (für Performance-Optimierung)
// ============================================================================

export const selectView = (state: PlantafelState) => state.view
export const selectCalendarView = (state: PlantafelState) => state.calendarView
export const selectDateRange = (state: PlantafelState) => state.dateRange
export const selectFilters = (state: PlantafelState) => state.filters
export const selectIsDialogOpen = (state: PlantafelState) => state.isDialogOpen
export const selectIsConflictPanelOpen = (state: PlantafelState) => state.isConflictPanelOpen
