"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Briefcase, TrendingUp, Clock, CheckCircle, Calendar, AlertTriangle } from 'lucide-react'
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
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ProjektePage() {
  const [projekte, setProjekte] = useState<Projekt[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProjekt, setSelectedProjekt] = useState<Projekt | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'alle' | 'aktiv' | 'in_planung'>('alle')
  const [filterTyp, setFilterTyp] = useState<'alle' | 'dachdecker' | 'maler' | 'bauunternehmen' | 'privat'>('alle')
  const [filterZeitraum, setFilterZeitraum] = useState<'alle' | 'woche' | 'tag' | 'monat' | 'benutzerdefiniert'>('alle')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({ from: undefined, to: undefined })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projektToDelete, setProjektToDelete] = useState<{ id: string, name: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showForceDeleteConfirm, setShowForceDeleteConfirm] = useState(false)
  const [forceDeleteConfirmText, setForceDeleteConfirmText] = useState('')
  const [relatedData, setRelatedData] = useState<{ rechnungen: number, dokumente: number, mitarbeiter: number, zeiterfassungen: number } | null>(null)

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

  const handleLoeschen = (id: string) => {
    const projektData = projekte.find(p => p._id === id)
    
    if (projektData) {
      setProjektToDelete({
        id,
        name: projektData.projektname || projektData.projektnummer || 'Unbenanntes Projekt'
      })
      setDeleteError(null)
      setShowForceDeleteConfirm(false)
      setForceDeleteConfirmText('')
      setRelatedData(null)
      setDeleteDialogOpen(true)
    }
  }

  const confirmLoeschen = async (force: boolean = false) => {
    if (!projektToDelete) return
    
    try {
      const url = force 
        ? `/api/projekte/${projektToDelete.id}?force=true`
        : `/api/projekte/${projektToDelete.id}`
        
      const response = await fetch(url, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message || 'Projekt erfolgreich gelöscht')
        loadProjekte()
        setDeleteDialogOpen(false)
        setProjektToDelete(null)
        setDeleteError(null)
        setShowForceDeleteConfirm(false)
        setForceDeleteConfirmText('')
        setRelatedData(null)
      } else {
        if (data.hasRelatedData && data.relatedData) {
          setDeleteError(data.fehler || 'Projekt hat zugeordnete Daten')
          setRelatedData(data.relatedData)
          setShowForceDeleteConfirm(true)
          setForceDeleteConfirmText('')
        } else {
          setDeleteError(data.fehler || 'Fehler beim Löschen des Projekts')
          setRelatedData(null)
        }
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      setDeleteError('Ein unerwarteter Fehler ist aufgetreten')
      setRelatedData(null)
    }
  }

  const handleForceDeleteConfirm = async () => {
    if (forceDeleteConfirmText !== 'LÖSCHEN') {
      toast.error('Bitte geben Sie "LÖSCHEN" ein, um fortzufahren')
      return
    }
    
    await confirmLoeschen(true)
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
    
    // Typ-Filter basierend auf Kunden-Branche
    const matchesTyp = filterTyp === 'alle' || (p as any).kundeBranche === filterTyp
    
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
                    <SelectItem value="privat">Privat</SelectItem>
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

      {/* Lösch-Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl text-gray-900">
                  Projekt löschen?
                </AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-gray-700 space-y-3 pt-2">
                {!showForceDeleteConfirm && !deleteError && (
                  <>
                    <div>
                      Möchten Sie das Projekt <span className="font-semibold text-gray-900">{projektToDelete?.name}</span> wirklich löschen?
                    </div>
                    <div className="text-sm text-gray-600">
                      Diese Aktion kann nicht rückgängig gemacht werden.
                    </div>
                  </>
                )}

                {deleteError && !showForceDeleteConfirm && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-red-800 font-medium mb-2">{deleteError}</div>
                    {relatedData && (
                      <div className="space-y-2 text-sm text-red-700">
                        <div className="font-medium">Folgende Daten sind mit diesem Projekt verknüpft:</div>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          {relatedData.rechnungen > 0 && (
                            <li>{relatedData.rechnungen} Rechnung{relatedData.rechnungen !== 1 ? 'en' : ''}</li>
                          )}
                          {relatedData.dokumente > 0 && (
                            <li>{relatedData.dokumente} Dokument{relatedData.dokumente !== 1 ? 'e' : ''}</li>
                          )}
                          {relatedData.mitarbeiter > 0 && (
                            <li>{relatedData.mitarbeiter} zugewiesene{relatedData.mitarbeiter !== 1 ? '' : 'r'} Mitarbeiter</li>
                          )}
                          {relatedData.zeiterfassungen > 0 && (
                            <li>{relatedData.zeiterfassungen} Zeiterfassung{relatedData.zeiterfassungen !== 1 ? 'en' : ''}</li>
                          )}
                        </ul>
                        <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                          <div className="font-semibold text-red-900">Trotzdem löschen?</div>
                          <div className="text-xs mt-1">Alle verknüpften Daten werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {showForceDeleteConfirm && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-red-800 font-semibold mb-3">⚠️ Endgültige Bestätigung erforderlich</div>
                    <div className="text-sm text-red-700 mb-3">
                      Das Löschen des Projekts <span className="font-semibold">{projektToDelete?.name}</span> und aller zugehörigen Daten ist unwiderruflich.
                    </div>
                    {relatedData && (
                      <div className="bg-white rounded p-3 mb-3 border border-red-300">
                        <div className="text-xs font-semibold text-red-900 mb-2">Es werden gelöscht:</div>
                        <ul className="text-xs text-red-800 space-y-1">
                          <li>• Das Projekt</li>
                          {relatedData.rechnungen > 0 && <li>• {relatedData.rechnungen} Rechnung{relatedData.rechnungen !== 1 ? 'en' : ''}</li>}
                          {relatedData.dokumente > 0 && <li>• {relatedData.dokumente} Dokument{relatedData.dokumente !== 1 ? 'e' : ''}</li>}
                          {relatedData.mitarbeiter > 0 && <li>• Zuweisung von {relatedData.mitarbeiter} Mitarbeiter{relatedData.mitarbeiter !== 1 ? 'n' : ''}</li>}
                          {relatedData.zeiterfassungen > 0 && <li>• {relatedData.zeiterfassungen} Zeiterfassung{relatedData.zeiterfassungen !== 1 ? 'en' : ''}</li>}
                        </ul>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="confirm-delete" className="text-sm font-medium text-red-900">
                        Geben Sie zur Bestätigung <span className="font-bold">LÖSCHEN</span> ein:
                      </Label>
                      <Input
                        id="confirm-delete"
                        value={forceDeleteConfirmText}
                        onChange={(e) => setForceDeleteConfirmText(e.target.value)}
                        className="border-red-300 focus:border-red-500 focus:ring-red-500"
                        placeholder="LÖSCHEN"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteDialogOpen(false)
                setProjektToDelete(null)
                setDeleteError(null)
                setShowForceDeleteConfirm(false)
                setForceDeleteConfirmText('')
                setRelatedData(null)
              }}
              className="border-gray-300 text-gray-900 hover:bg-gray-50"
            >
              Abbrechen
            </AlertDialogCancel>
            {!showForceDeleteConfirm && !deleteError && (
              <Button 
                onClick={() => confirmLoeschen(false)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Projekt löschen
              </Button>
            )}
            {deleteError && !showForceDeleteConfirm && relatedData && (
              <Button 
                onClick={() => setShowForceDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Trotzdem löschen
              </Button>
            )}
            {showForceDeleteConfirm && (
              <Button 
                onClick={handleForceDeleteConfirm}
                disabled={forceDeleteConfirmText !== 'LÖSCHEN'}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Endgültig löschen
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


