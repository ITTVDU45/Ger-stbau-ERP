'use client'

/**
 * PlantafelToolbar
 * 
 * Toolbar für die Plantafel mit:
 * - View-Switch (Team/Projekt)
 * - Kalender-View (Woche/Monat/Tag)
 * - Datum-Navigation
 * - Filter (Mitarbeiter, Projekte)
 * - Suche
 */

import { format, startOfDay, endOfDay } from 'date-fns'
import { de } from 'date-fns/locale'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Briefcase,
  Filter,
  Search,
  AlertTriangle,
  Plus,
  RotateCcw
} from 'lucide-react'
import { usePlantafelStore } from '@/lib/stores/plantafelStore'
import { useEmployees, useProjects } from '@/lib/queries/plantafelQueries'
import { PlantafelView } from './types'

interface PlantafelToolbarProps {
  conflictCount?: number
  onCreateClick?: () => void
}

export default function PlantafelToolbar({ conflictCount = 0, onCreateClick }: PlantafelToolbarProps) {
  const {
    view,
    setView,
    calendarView,
    setCalendarView,
    currentDate,
    goToToday,
    goToPrevious,
    goToNext,
    filters,
    setFilters,
    toggleEmployeeFilter,
    toggleProjectFilter,
    resetFilters,
    searchTerm,
    setSearchTerm,
    isConflictPanelOpen,
    toggleConflictPanel,
    setDateRange
  } = usePlantafelStore()
  
  const { data: employees = [] } = useEmployees()
  const { data: projects = [] } = useProjects()
  
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  
  // Formatiere das angezeigte Datum basierend auf der Ansicht
  const getDisplayDate = () => {
    if (calendarView === 'week') {
      const weekStart = format(currentDate, 'dd.MM.', { locale: de })
      return `KW ${format(currentDate, 'w', { locale: de })} • ${format(currentDate, 'MMMM yyyy', { locale: de })}`
    } else if (calendarView === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: de })
    } else {
      return format(currentDate, 'EEEE, dd. MMMM yyyy', { locale: de })
    }
  }
  
  // Prüfe ob aktuell "Heute" angezeigt wird
  const isToday = () => {
    const today = new Date()
    return currentDate.toDateString() === today.toDateString()
  }
  
  const activeFilterCount = filters.employeeIds.length + filters.projectIds.length
  
  // Setze benutzerdefinierten Zeitraum
  const applyCustomDateRange = () => {
    if (customDateFrom && customDateTo) {
      const from = startOfDay(new Date(customDateFrom))
      const to = endOfDay(new Date(customDateTo))
      
      if (from <= to) {
        setDateRange({ start: from, end: to })
        setDateFilterOpen(false)
      }
    }
  }
  
  return (
    <div className="flex flex-col gap-4 p-4 bg-white text-gray-900 border-b border-gray-200 shadow-sm">
      {/* Obere Reihe: View-Switch, Datum-Navigation, Aktionen */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* View-Switch */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('team')}
              className={view === 'team' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'}
            >
              <Users className="h-4 w-4 mr-2" />
              Team
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('project')}
              className={view === 'project' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Projekte
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-8 mx-2" />
          
          {/* Kalender-View */}
          <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-100">
            {(['day', 'week', 'month'] as const).map((v) => (
              <Button
                key={v}
                variant="ghost"
                size="sm"
                onClick={() => setCalendarView(v)}
                className={calendarView === v 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'}
              >
                {v === 'day' ? 'Tag' : v === 'week' ? 'Woche' : 'Monat'}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Datum-Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </Button>
          
          {/* Datum-Filter Dropdown */}
          <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={!isToday() ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}
              >
                <Calendar className="h-4 w-4 mr-2 text-gray-600" />
                {isToday() ? 'Heute' : 'Filter aktiv'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-white border border-gray-200 shadow-xl" align="start">
              <div className="p-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">Zeitraum auswählen</p>
              </div>
              
              <div className="p-4 space-y-3">
                {/* Schnell-Optionen */}
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      goToToday()
                      setDateFilterOpen(false)
                    }}
                  >
                    📅 Heute
                  </Button>
                  
                  <Separator />
                  
                  {/* Benutzerdefinierter Zeitraum */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-sm font-medium text-gray-900">
                      Benutzerdefiniert
                    </Label>
                    
                    <div className="grid gap-2">
                      <div>
                        <Label htmlFor="date-from" className="text-xs text-gray-600">
                          Von
                        </Label>
                        <Input
                          id="date-from"
                          type="date"
                          value={customDateFrom}
                          onChange={(e) => setCustomDateFrom(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="date-to" className="text-xs text-gray-600">
                          Bis
                        </Label>
                        <Input
                          id="date-to"
                          type="date"
                          value={customDateTo}
                          onChange={(e) => setCustomDateTo(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={applyCustomDateRange}
                      disabled={!customDateFrom || !customDateTo}
                    >
                      Zeitraum anwenden
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" size="sm" onClick={goToNext}>
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </Button>
          <span className="text-sm font-semibold text-gray-900 min-w-[200px] text-center">
            {getDisplayDate()}
          </span>
        </div>
        
        {/* Aktionen */}
        <div className="flex items-center gap-2">
          {/* Konflikt-Button */}
          <Button
            variant={isConflictPanelOpen ? 'default' : 'outline'}
            size="sm"
            onClick={toggleConflictPanel}
            className={conflictCount > 0 ? 'border-red-300 text-red-700 bg-red-50' : 'text-gray-700 border-gray-200'}
          >
            <AlertTriangle className={`h-4 w-4 mr-2 ${conflictCount > 0 ? 'text-red-500' : 'text-gray-500'}`} />
            Konflikte
            {conflictCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {conflictCount}
              </Badge>
            )}
          </Button>
          
          {/* Neuer Einsatz */}
          <Button onClick={onCreateClick} className="bg-green-600 hover:bg-green-700 text-white shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            Neuer Einsatz
          </Button>
        </div>
      </div>
      
      {/* Untere Reihe: Filter und Suche */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Suche */}
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Mitarbeiter oder Projekt suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 text-gray-900"
          />
        </div>
        
        {/* Mitarbeiter-Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="border-gray-200 text-gray-700 bg-white">
              <Users className="h-4 w-4 mr-2" />
              Mitarbeiter
              {filters.employeeIds.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filters.employeeIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0 bg-white border border-gray-200 shadow-xl" align="start">
            <div className="p-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Mitarbeiter filtern</p>
            </div>
            <ScrollArea className="h-64">
              <div className="p-3 space-y-2">
                {employees.filter(e => e.aktiv).map((employee) => (
                  <div key={employee._id} className="flex items-center gap-2">
                    <Checkbox
                      id={`emp-${employee._id}`}
                      checked={filters.employeeIds.includes(employee._id || '')}
                      onCheckedChange={() => toggleEmployeeFilter(employee._id || '')}
                    />
                    <label
                      htmlFor={`emp-${employee._id}`}
                      className="text-sm text-gray-700 cursor-pointer"
                    >
                      {employee.vorname} {employee.nachname}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        
        {/* Projekt-Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="border-gray-200 text-gray-700 bg-white">
              <Briefcase className="h-4 w-4 mr-2" />
              Projekte
              {filters.projectIds.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filters.projectIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 bg-white border border-gray-200 shadow-xl" align="start">
            <div className="p-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Projekte filtern</p>
            </div>
            <ScrollArea className="h-64">
              <div className="p-3 space-y-2">
                {projects.filter(p => ['in_planung', 'aktiv'].includes(p.status)).map((project) => (
                  <div key={project._id} className="flex items-center gap-2">
                    <Checkbox
                      id={`proj-${project._id}`}
                      checked={filters.projectIds.includes(project._id || '')}
                      onCheckedChange={() => toggleProjectFilter(project._id || '')}
                    />
                    <label
                      htmlFor={`proj-${project._id}`}
                      className="text-sm text-gray-700 cursor-pointer"
                    >
                      {project.projektname}
                      <span className="text-xs text-gray-400 ml-1">({project.projektnummer})</span>
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        
        {/* Abwesenheiten Toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-absences"
            checked={filters.showAbsences}
            onCheckedChange={(checked) => setFilters({ showAbsences: !!checked })}
          />
          <label
            htmlFor="show-absences"
            className="text-sm text-gray-700 cursor-pointer"
          >
            Abwesenheiten anzeigen
          </label>
        </div>
        
        {/* Filter zurücksetzen */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-gray-500 hover:text-gray-900">
            <RotateCcw className="h-4 w-4 mr-2" />
            Filter zurücksetzen
          </Button>
        )}
      </div>
    </div>
  )
}
