/**
 * TanStack Query Hooks für die Plantafel
 * 
 * Beinhaltet:
 * - useAssignments: Lädt Einsätze + Urlaube für Zeitraum
 * - useCreateAssignment: Erstellt neuen Einsatz
 * - useUpdateAssignment: Aktualisiert Einsatz (Drag & Drop)
 * - useDeleteAssignment: Löscht Einsatz
 * - useConflicts: Lädt Konflikte für Zeitraum
 * - useEmployees: Lädt Mitarbeiter-Liste
 * - useProjects: Lädt Projekt-Liste
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  PlantafelView,
  PlantafelFilters,
  AssignmentsResponse,
  ConflictsResponse,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  DateRange
} from '@/components/plantafel/types'
import { Mitarbeiter, Projekt } from '@/lib/db/types'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const plantafelKeys = {
  all: ['plantafel'] as const,
  assignments: (from: string, to: string, view: PlantafelView, filters: PlantafelFilters) => 
    [...plantafelKeys.all, 'assignments', from, to, view, filters] as const,
  conflicts: (from: string, to: string) => 
    [...plantafelKeys.all, 'conflicts', from, to] as const,
  employees: () => [...plantafelKeys.all, 'employees'] as const,
  projects: () => [...plantafelKeys.all, 'projects'] as const,
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchAssignments(
  from: string,
  to: string,
  view: PlantafelView,
  filters: PlantafelFilters
): Promise<AssignmentsResponse> {
  const params = new URLSearchParams({
    from,
    to,
    view,
    showAbsences: filters.showAbsences.toString()
  })
  
  if (filters.employeeIds.length > 0) {
    params.set('employeeIds', filters.employeeIds.join(','))
  }
  if (filters.projectIds.length > 0) {
    params.set('projectIds', filters.projectIds.join(','))
  }
  
  const response = await fetch(`/api/plantafel/assignments?${params}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.fehler || 'Fehler beim Laden der Einsätze')
  }
  
  const data = await response.json()
  
  // Konvertiere Date-Strings zurück zu Date-Objekten
  return {
    ...data,
    events: data.events.map((e: any) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end)
    })),
    conflicts: data.conflicts.map((c: any) => ({
      ...c,
      overlapStart: new Date(c.overlapStart),
      overlapEnd: new Date(c.overlapEnd),
      event1: { ...c.event1, start: new Date(c.event1.start), end: new Date(c.event1.end) },
      event2: { ...c.event2, start: new Date(c.event2.start), end: new Date(c.event2.end) }
    }))
  }
}

async function fetchConflicts(from: string, to: string): Promise<ConflictsResponse> {
  const params = new URLSearchParams({ from, to })
  const response = await fetch(`/api/plantafel/conflicts?${params}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.fehler || 'Fehler beim Laden der Konflikte')
  }
  
  const data = await response.json()
  
  return {
    ...data,
    conflicts: data.conflicts.map((c: any) => ({
      ...c,
      overlapStart: new Date(c.overlapStart),
      overlapEnd: new Date(c.overlapEnd),
      event1: { ...c.event1, start: new Date(c.event1.start), end: new Date(c.event1.end) },
      event2: { ...c.event2, start: new Date(c.event2.start), end: new Date(c.event2.end) }
    }))
  }
}

async function fetchEmployees(): Promise<Mitarbeiter[]> {
  const response = await fetch('/api/mitarbeiter')
  
  if (!response.ok) {
    throw new Error('Fehler beim Laden der Mitarbeiter')
  }
  
  const data = await response.json()
  return data.mitarbeiter || []
}

async function fetchProjects(): Promise<Projekt[]> {
  const response = await fetch('/api/projekte')
  
  if (!response.ok) {
    throw new Error('Fehler beim Laden der Projekte')
  }
  
  const data = await response.json()
  return data.projekte || []
}

async function createAssignment(data: CreateAssignmentRequest) {
  const response = await fetch('/api/plantafel/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.fehler || 'Fehler beim Erstellen des Einsatzes')
  }
  
  return response.json()
}

async function updateAssignment(id: string, data: UpdateAssignmentRequest) {
  const response = await fetch(`/api/plantafel/assignments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.fehler || 'Fehler beim Aktualisieren des Einsatzes')
  }
  
  return response.json()
}

async function deleteAssignment(id: string) {
  const response = await fetch(`/api/plantafel/assignments/${id}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.fehler || 'Fehler beim Löschen des Einsatzes')
  }
  
  return response.json()
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook zum Laden von Einsätzen und Abwesenheiten
 */
export function useAssignments(
  dateRange: DateRange,
  view: PlantafelView,
  filters: PlantafelFilters,
  enabled = true
) {
  const from = format(dateRange.start, 'yyyy-MM-dd')
  const to = format(dateRange.end, 'yyyy-MM-dd')
  
  return useQuery({
    queryKey: plantafelKeys.assignments(from, to, view, filters),
    queryFn: () => fetchAssignments(from, to, view, filters),
    enabled,
    staleTime: 30 * 1000, // 30 Sekunden
    refetchOnWindowFocus: true
  })
}

/**
 * Hook zum Laden von Konflikten
 */
export function useConflicts(dateRange: DateRange, enabled = true) {
  const from = format(dateRange.start, 'yyyy-MM-dd')
  const to = format(dateRange.end, 'yyyy-MM-dd')
  
  return useQuery({
    queryKey: plantafelKeys.conflicts(from, to),
    queryFn: () => fetchConflicts(from, to),
    enabled,
    staleTime: 30 * 1000
  })
}

/**
 * Hook zum Laden von Mitarbeitern
 */
export function useEmployees() {
  return useQuery({
    queryKey: plantafelKeys.employees(),
    queryFn: fetchEmployees,
    staleTime: 5 * 60 * 1000 // 5 Minuten
  })
}

/**
 * Hook zum Laden von Projekten
 */
export function useProjects() {
  return useQuery({
    queryKey: plantafelKeys.projects(),
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook zum Erstellen eines neuen Einsatzes
 */
export function useCreateAssignment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      // Invalidiere alle Assignment-Queries
      queryClient.invalidateQueries({ queryKey: ['plantafel', 'assignments'] })
      queryClient.invalidateQueries({ queryKey: ['plantafel', 'conflicts'] })
    }
  })
}

/**
 * Hook zum Aktualisieren eines Einsatzes (Drag & Drop, Resize)
 */
export function useUpdateAssignment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssignmentRequest }) => 
      updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantafel', 'assignments'] })
      queryClient.invalidateQueries({ queryKey: ['plantafel', 'conflicts'] })
    }
  })
}

/**
 * Hook zum Löschen eines Einsatzes
 */
export function useDeleteAssignment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantafel', 'assignments'] })
      queryClient.invalidateQueries({ queryKey: ['plantafel', 'conflicts'] })
    }
  })
}
