"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Briefcase, TrendingUp, Clock, CheckCircle, Calendar } from 'lucide-react'
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton'
import { Projekt } from '@/lib/db/types'
import ProjektTabelle from './components/ProjektTabelle'
import ProjektDialog from './components/ProjektDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'

export default function ProjektePage() {
  const [projekte, setProjekte] = useState<Projekt[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProjekt, setSelectedProjekt] = useState<Projekt | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'alle' | 'aktiv' | 'in_planung'>('alle')
  const [filterTyp, setFilterTyp] = useState<'alle' | 'dachdecker' | 'maler' | 'bauunternehmen'>('alle')
  const [filterZeitraum, setFilterZeitraum] = useState<'alle' | 'woche' | 'tag' | 'monat' | 'benutzerdefiniert'>('alle')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({ from: undefined, to: undefined })

  useEffect(() => {
    loadProjekte()
  }, [])

  const loadProjekte = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projekte')
      if (response.ok) {
        const data = await response.json()
        setProjekte(data.projekte || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNeuesProjekt = () => {
    setSelectedProjekt(undefined)
    setDialogOpen(true)
  }

  const handleBearbeiten = (projekt: Projekt) => {
    setSelectedProjekt(projekt)
    setDialogOpen(true)
  }

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false)
    setSelectedProjekt(undefined)
    if (updated) {
      loadProjekte()
    }
  }

  const handleLoeschen = async (id: string) => {
    if (!confirm('Möchten Sie dieses Projekt wirklich löschen?')) return
    
    try {
      const response = await fetch(`/api/projekte/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadProjekte()
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
    }
  }

  const getZeitraumRange = () => {
    const heute = new Date()
    switch (filterZeitraum) {
      case 'tag':
        return { from: startOfDay(heute), to: endOfDay(heute) }
      case 'woche':
        return { from: startOfWeek(heute, { locale: de }), to: endOfWeek(heute, { locale: de }) }
      case 'monat':
        return { from: startOfMonth(heute), to: endOfMonth(heute) }
      case 'benutzerdefiniert':
        return dateRange
      default:
        return { from: undefined, to: undefined }
    }
  }

  const filteredProjekte = projekte.filter(p => {
    const matchesSearch = searchTerm === '' || 
      p.projektname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.kundeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projektnummer.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'alle' || p.status === filterStatus
    
    // Typ-Filter basierend auf angebotTyp (falls vorhanden)
    const matchesTyp = filterTyp === 'alle' || (p as any).angebotTyp === filterTyp
    
    // Zeitraum-Filter basierend auf startdatum
    const zeitraumRange = getZeitraumRange()
    let matchesZeitraum = true
    if (zeitraumRange.from && zeitraumRange.to && p.startdatum) {
      const projektStart = new Date(p.startdatum)
      matchesZeitraum = projektStart >= zeitraumRange.from && projektStart <= zeitraumRange.to
    } else if (filterZeitraum !== 'alle' && !p.startdatum) {
      matchesZeitraum = false
    }
    
    return matchesSearch && matchesFilter && matchesTyp && matchesZeitraum
  })

  const stats = {
    gesamt: projekte.length,
    aktiv: projekte.filter(p => p.status === 'aktiv').length,
    inPlanung: projekte.filter(p => p.status === 'in_planung').length,
    abgeschlossen: projekte.filter(p => p.status === 'abgeschlossen').length,
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl text-gray-900">Projekt-Verwaltung</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-700">
                Verwalten Sie alle Bauprojekte und Baustellen
              </CardDescription>
            </div>
            <Button onClick={handleNeuesProjekt} className="hidden md:flex bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Neues Projekt
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      {/* Mobile FAB */}
      <FloatingActionButton 
        onClick={handleNeuesProjekt}
        label="Neues Projekt"
      />

      {/* Statistiken */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesamt</CardTitle>
            <Briefcase className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.gesamt}</div>
            <p className="text-xs text-gray-600 mt-1">Alle Projekte</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Aktiv</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.aktiv}</div>
            <p className="text-xs text-gray-600 mt-1">Laufende Projekte</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">In Planung</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inPlanung}</div>
            <p className="text-xs text-gray-600 mt-1">In Vorbereitung</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Abgeschlossen</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.abgeschlossen}</div>
            <p className="text-xs text-gray-600 mt-1">Erfolgreich beendet</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Suche */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Erste Reihe: Suche und Status */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Projekt, Kunde oder Projektnummer suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-gray-300 text-gray-900"
                />
              </div>
              <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="w-full sm:w-auto">
                <TabsList>
                  <TabsTrigger value="alle">Alle</TabsTrigger>
                  <TabsTrigger value="aktiv">Aktiv</TabsTrigger>
                  <TabsTrigger value="in_planung">In Planung</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Zweite Reihe: Branche und Zeitraum Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Branche Filter */}
              <div className="flex items-center gap-2">
                <Label className="text-gray-900 whitespace-nowrap">Branche:</Label>
                <Select value={filterTyp} onValueChange={(v) => setFilterTyp(v as any)}>
                  <SelectTrigger className="w-[180px] bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle Branchen</SelectItem>
                    <SelectItem value="dachdecker">Dachdecker</SelectItem>
                    <SelectItem value="maler">Maler</SelectItem>
                    <SelectItem value="bauunternehmen">Bauunternehmen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Zeitraum Filter */}
              <div className="flex items-center gap-2">
                <Label className="text-gray-900 whitespace-nowrap">Zeitraum:</Label>
                <Select 
                  value={filterZeitraum} 
                  onValueChange={(v) => {
                    setFilterZeitraum(v as any)
                    if (v !== 'benutzerdefiniert') {
                      setDateRange({ from: undefined, to: undefined })
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px] bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle Zeiträume</SelectItem>
                    <SelectItem value="tag">Heute</SelectItem>
                    <SelectItem value="woche">Diese Woche</SelectItem>
                    <SelectItem value="monat">Dieser Monat</SelectItem>
                    <SelectItem value="benutzerdefiniert">Benutzerdefiniert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Benutzerdefinierter Zeitraum DatePicker */}
              {filterZeitraum === 'benutzerdefiniert' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd.MM.yyyy", { locale: de })} -{" "}
                            {format(dateRange.to, "dd.MM.yyyy", { locale: de })}
                          </>
                        ) : (
                          format(dateRange.from, "dd.MM.yyyy", { locale: de })
                        )
                      ) : (
                        "Datum wählen"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={2}
                      locale={de}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProjektTabelle
            projekte={filteredProjekte}
            loading={loading}
            onBearbeiten={handleBearbeiten}
            onLoeschen={handleLoeschen}
          />
        </CardContent>
      </Card>

      {/* Dialog */}
      <ProjektDialog
        open={dialogOpen}
        projekt={selectedProjekt}
        onClose={handleDialogClose}
      />
    </div>
  )
}


