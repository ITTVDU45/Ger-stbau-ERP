'use client'

/**
 * ProjektSidebar (erweitert für Mitarbeiter + Projekte)
 * 
 * Seitenleiste die dynamisch entweder Mitarbeiter (Team-View) oder Projekte (Projekt-View) anzeigt
 * 
 * Team-View:
 * - Liste aller aktiven Mitarbeiter mit Suchleiste
 * - Draggable Mitarbeiter-Karten
 * 
 * Projekt-View:
 * - Gruppiert nach Aufbau und Abbau
 * - Draggable Projekt-Karten
 * - Zeigt nur Projekte die noch keinen Aufbau/Abbau haben
 */

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProjects, useAllAssignments, useEmployees } from '@/lib/queries/plantafelQueries'
import { Projekt, Mitarbeiter } from '@/lib/db/types'
import { GripVertical, Building2, MapPin, Check, User, Search, X } from 'lucide-react'
import { usePlantafelStore } from '@/lib/stores/plantafelStore'
import { Button } from '@/components/ui/button'

// ============================================================================
// TYPES
// ============================================================================

export interface DraggedProject {
  projektId: string
  projektName: string
  typ: 'aufbau' | 'abbau'
  adresse: string
  ort: string
}

export interface DraggedMitarbeiter {
  mitarbeiterId: string
  mitarbeiterName: string
  personalnummer: string
}

// ============================================================================
// MITARBEITER CARD COMPONENT
// ============================================================================

interface MitarbeiterKarteProps {
  mitarbeiter: Mitarbeiter
}

function MitarbeiterKarte({ mitarbeiter }: MitarbeiterKarteProps) {
  const [isDragging, setIsDragging] = useState(false)
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(true)
    
    const dragData: DraggedMitarbeiter = {
      mitarbeiterId: mitarbeiter._id || '',
      mitarbeiterName: `${mitarbeiter.vorname} ${mitarbeiter.nachname}`,
      personalnummer: mitarbeiter.personalnummer || ''
    }
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'copy'
    
    // Visuelles Feedback
    if (e.dataTransfer.setDragImage) {
      const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
      dragImage.style.opacity = '0.8'
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, 0, 0)
      setTimeout(() => document.body.removeChild(dragImage), 0)
    }
  }
  
  const handleDragEnd = () => {
    setIsDragging(false)
  }
  
  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        group relative bg-blue-50 hover:bg-blue-100 rounded-lg p-3 cursor-grab
        border border-blue-200 hover:border-blue-300
        transition-all duration-150 select-none
        ${isDragging ? 'opacity-50 scale-95 cursor-grabbing' : ''}
      `}
    >
      {/* Drag Handle */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical className="h-4 w-4 text-blue-400" />
      </div>
      
      {/* Mitarbeiter Icon */}
      <div className="flex items-center gap-2 mb-1">
        <div className="h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center">
          <User className="h-4 w-4 text-blue-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm truncate">
            {mitarbeiter.vorname} {mitarbeiter.nachname}
          </h4>
          {mitarbeiter.personalnummer && (
            <p className="text-xs text-gray-500">
              #{mitarbeiter.personalnummer}
            </p>
          )}
        </div>
      </div>
      
      {/* Position */}
      {mitarbeiter.position && (
        <Badge variant="outline" className="text-xs bg-white text-gray-700 border-gray-300 mt-1">
          {mitarbeiter.position}
        </Badge>
      )}
    </div>
  )
}

// ============================================================================
// PROJECT CARD COMPONENT
// ============================================================================

interface ProjektKarteProps {
  projekt: Projekt
  typ: 'aufbau' | 'abbau'
}

function ProjektKarte({ projekt, typ }: ProjektKarteProps) {
  const [isDragging, setIsDragging] = useState(false)
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(true)
    
    const dragData: DraggedProject = {
      projektId: projekt._id || '',
      projektName: projekt.projektname,
      typ,
      adresse: projekt.bauvorhaben?.adresse || '',
      ort: projekt.bauvorhaben?.ort || ''
    }
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'copy'
    
    // Visuelles Feedback
    if (e.dataTransfer.setDragImage) {
      const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
      dragImage.style.opacity = '0.8'
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, 0, 0)
      setTimeout(() => document.body.removeChild(dragImage), 0)
    }
  }
  
  const handleDragEnd = () => {
    setIsDragging(false)
  }
  
  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        group relative bg-gray-100 hover:bg-gray-200 rounded-lg p-3 cursor-grab
        border border-gray-200 hover:border-gray-300
        transition-all duration-150 select-none
        ${isDragging ? 'opacity-50 scale-95 cursor-grabbing' : ''}
      `}
    >
      {/* Drag Handle */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      
      {/* Badge */}
      <Badge 
        variant="outline" 
        className="mb-2 text-xs bg-orange-100 text-orange-700 border-orange-300"
      >
        Ohne Dauer
      </Badge>
      
      {/* Projektname */}
      <h4 className="font-semibold text-gray-900 text-sm truncate">
        {projekt.projektname}
      </h4>
      
      {/* Adresse */}
      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
        <MapPin className="h-3 w-3" />
        <span className="truncate">
          {projekt.bauvorhaben?.adresse}, {projekt.bauvorhaben?.plz} {projekt.bauvorhaben?.ort}
        </span>
      </div>
      
      {/* Projektnummer */}
      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
        <Building2 className="h-3 w-3" />
        <span>{projekt.projektnummer}</span>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProjektSidebar() {
  const { view, setSidebarMode } = usePlantafelStore()
  const { data: projekte = [], isLoading: projektLoading } = useProjects()
  const { data: mitarbeiter = [], isLoading: mitarbeiterLoading } = useEmployees()
  // Lade ALLE Assignments (ohne Datumsfilter) um zu prüfen welche Projekte bereits geplant sind
  const { data: allAssignments = [], isLoading: assignmentLoading } = useAllAssignments()
  const [activeTab, setActiveTab] = useState<'aufbau' | 'abbau'>('aufbau')
  const [searchTerm, setSearchTerm] = useState('')
  
  const isLoading = projektLoading || assignmentLoading || mitarbeiterLoading
  
  // Filtere aktive Mitarbeiter basierend auf Suchbegriff
  const filteredMitarbeiter = useMemo(() => {
    const aktiveMitarbeiter = mitarbeiter.filter(m => m.aktiv !== false)
    
    if (!searchTerm) return aktiveMitarbeiter
    
    const term = searchTerm.toLowerCase()
    return aktiveMitarbeiter.filter(m => 
      `${m.vorname} ${m.nachname}`.toLowerCase().includes(term) ||
      m.personalnummer?.toLowerCase().includes(term) ||
      m.position?.toLowerCase().includes(term)
    )
  }, [mitarbeiter, searchTerm])
  
  // Ermittle welche Projekte bereits Aufbau/Abbau haben
  const { projekteOhneAufbau, projekteOhneAbbau } = useMemo(() => {
    // Set mit Projekt-IDs die Aufbau haben
    const projekteMitAufbau = new Set<string>()
    // Set mit Projekt-IDs die Abbau haben
    const projekteMitAbbau = new Set<string>()
    
    console.log('[ProjektSidebar] Prüfe Events:', allAssignments.length)
    
    // Prüfe alle Events (aus der gesamten Datenbank)
    // Events haben IDs wie "einsatz-{id}-setup" oder "einsatz-{id}-dismantle"
    allAssignments.forEach(event => {
      const projektId = event.projektId?.toString() || ''
      if (!projektId) return
      
      const eventId = event.id || ''
      const title = (event.title || '').toLowerCase()
      
      // Prüfe auf Aufbau-Event:
      // - Event-ID endet mit "-setup"
      // - Titel enthält "(aufbau)"
      // - setupDate ist gesetzt
      if (
        eventId.endsWith('-setup') || 
        title.includes('(aufbau)') ||
        (event.setupDate && event.setupDate.trim() !== '')
      ) {
        projekteMitAufbau.add(projektId)
        console.log(`[ProjektSidebar] Projekt ${projektId} hat Aufbau (Event: ${eventId})`)
      }
      
      // Prüfe auf Abbau-Event:
      // - Event-ID endet mit "-dismantle"
      // - Titel enthält "(abbau)"
      // - dismantleDate ist gesetzt
      if (
        eventId.endsWith('-dismantle') || 
        title.includes('(abbau)') ||
        (event.dismantleDate && event.dismantleDate.trim() !== '')
      ) {
        projekteMitAbbau.add(projektId)
        console.log(`[ProjektSidebar] Projekt ${projektId} hat Abbau (Event: ${eventId})`)
      }
    })
    
    console.log('[ProjektSidebar] Projekte mit Aufbau:', Array.from(projekteMitAufbau))
    console.log('[ProjektSidebar] Projekte mit Abbau:', Array.from(projekteMitAbbau))
    
    // Filtere Projekte mit Status "in_planung" oder "aktiv"
    const alleProjekte = projekte.filter(p => ['in_planung', 'aktiv'].includes(p.status))
    
    const ohneAufbau = alleProjekte.filter(p => !projekteMitAufbau.has(p._id || ''))
    const ohneAbbau = alleProjekte.filter(p => !projekteMitAbbau.has(p._id || ''))
    
    console.log('[ProjektSidebar] Projekte ohne Aufbau:', ohneAufbau.map(p => p.projektname))
    console.log('[ProjektSidebar] Projekte ohne Abbau:', ohneAbbau.map(p => p.projektname))
    
    return {
      projekteOhneAufbau: ohneAufbau,
      projekteOhneAbbau: ohneAbbau
    }
  }, [projekte, allAssignments])
  
  // Zähle Projekte für Header
  const aufbauCount = projekteOhneAufbau.length
  const abbauCount = projekteOhneAbbau.length
  const projektCount = activeTab === 'aufbau' ? aufbauCount : abbauCount
  
  if (isLoading) {
    return (
      <div className="w-[300px] border-l border-gray-200 bg-white p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }
  
  // Team-View: Zeige Mitarbeiter
  if (view === 'team') {
    return (
      <div className="w-[300px] border-l border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" />
              Mitarbeiter
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                {filteredMitarbeiter.length}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarMode(null)}
                className="h-6 w-6 hover:bg-gray-200"
                title="Schließen"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Per Drag & Drop in den Kalender ziehen
          </p>
          
          {/* Suchleiste */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Mitarbeiter suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </div>
        
        {/* Mitarbeiter Liste */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {filteredMitarbeiter.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'Keine Mitarbeiter gefunden' : 'Keine aktiven Mitarbeiter'}
                </p>
              </div>
            ) : (
              filteredMitarbeiter.map((m) => (
                <MitarbeiterKarte key={m._id} mitarbeiter={m} />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    )
  }
  
  // Projekt-View: Zeige Projekte
  return (
    <div className="w-[300px] border-l border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Nicht terminiert</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              {projektCount}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarMode(null)}
              className="h-6 w-6 hover:bg-gray-200"
              title="Schließen"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Projekte per Drag & Drop in den Kalender ziehen
        </p>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'aufbau' | 'abbau')} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-2 mx-4 mt-4">
          <TabsTrigger value="aufbau" className="text-sm">
            Aufbau
            <Badge variant="outline" className="ml-2 text-xs">
              {aufbauCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="abbau" className="text-sm">
            Abbau
            <Badge variant="outline" className="ml-2 text-xs">
              {abbauCount}
            </Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="aufbau" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {projekteOhneAufbau.length === 0 ? (
                <div className="text-center py-8">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Alle Projekte haben einen Aufbau-Termin
                  </p>
                </div>
              ) : (
                projekteOhneAufbau.map((projekt) => (
                  <ProjektKarte 
                    key={`aufbau-${projekt._id}`} 
                    projekt={projekt} 
                    typ="aufbau" 
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="abbau" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {projekteOhneAbbau.length === 0 ? (
                <div className="text-center py-8">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Alle Projekte haben einen Abbau-Termin
                  </p>
                </div>
              ) : (
                projekteOhneAbbau.map((projekt) => (
                  <ProjektKarte 
                    key={`abbau-${projekt._id}`} 
                    projekt={projekt} 
                    typ="abbau" 
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
