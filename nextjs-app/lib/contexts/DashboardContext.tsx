"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

// Typen für das Dashboard
export interface FilterState {
  timeframe: '7d' | '30d' | '3m'
  status: string[]
  vehicleType?: string
  gutachter?: string
}

export interface CardKPI {
  id: string
  title: string
  value: string | number
  type: 'count' | 'currency'
  color: string
  icon?: string
}

export interface ChartData {
  id: string
  title: string
  type: 'donut' | 'line' | 'pie' | 'map'
  data: any[]
}

export interface TableData {
  id: string
  title: string
  type: 'tasks' | 'cases' | 'documents' | 'partners'
  columns: { key: string; label: string; type?: 'text' | 'number' | 'date' | 'status' }[]
  data: any[]
  pagination?: { page: number; pageSize: number; total: number }
}

export interface DashboardData {
  cards: CardKPI[]
  charts: ChartData[]
  tables: TableData[]
}

// Context-Typ
interface DashboardContextType {
  filterState: FilterState
  setFilterState: (filters: Partial<FilterState>) => void
  dashboardData: DashboardData
  setDashboardData: (data: DashboardData) => void
  filteredCards: CardKPI[]
  filteredCharts: ChartData[]
  filteredTables: TableData[]
}

// Default Filter
const defaultFilters: FilterState = {
  timeframe: '30d',
  status: ['aktiv', 'in Bearbeitung', 'abgeschlossen'],
  vehicleType: '',
  gutachter: ''
}

// Context erstellen
const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

// Provider-Komponente
export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [filterState, setFilterStateInternal] = useState<FilterState>(defaultFilters)
  const [dashboardData, setDashboardDataInternal] = useState<DashboardData>({
    cards: [],
    charts: [],
    tables: []
  })

  // Filter aktualisieren (memoized)
  const setFilterState = useCallback((filters: Partial<FilterState>) => {
    setFilterStateInternal(prev => ({ ...prev, ...filters }))
  }, [])

  // Dashboard-Daten aktualisieren (memoized)
  const setDashboardData = useCallback((data: DashboardData) => {
    setDashboardDataInternal(data)
  }, [])

  // Gefilterte Daten (echte Filter-Logik)
  const filteredCards = useMemo(() => {
    return dashboardData.cards
  }, [dashboardData.cards])

  const filteredCharts = useMemo(() => {
    return dashboardData.charts
  }, [dashboardData.charts])

  const filteredTables = useMemo(() => {
    return dashboardData.tables
  }, [dashboardData.tables])

  const value = useMemo<DashboardContextType>(() => ({
    filterState,
    setFilterState,
    dashboardData,
    setDashboardData,
    filteredCards,
    filteredCharts,
    filteredTables
  }), [filterState, dashboardData, setFilterState, setDashboardData, filteredCards, filteredCharts, filteredTables])

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

// Hook zum Verwenden des Contexts
export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
