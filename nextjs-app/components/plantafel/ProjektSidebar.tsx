'use client'

/**
 * ProjektSidebar
 * 
 * Seitenleiste mit Projekten (Status: in_planung), die per Drag & Drop
 * in den Kalender gezogen werden können.
 * 
 * - Gruppiert nach Aufbau und Abbau
 * - Draggable Karten mit HTML5 Drag API
 * - Zeigt nur Projekte die noch keinen Aufbau/Abbau haben
 */

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProjects, useAllAssignments } from '@/lib/queries/plantafelQueries'
import { Projekt } from '@/lib/db/types'
import { GripVertical, Building2, MapPin, Check } from 'lucide-react'

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
  const { data: projekte = [], isLoading: projektLoading } = useProjects()
  // Lade ALLE Assignments (ohne Datumsfilter) um zu prüfen welche Projekte bereits geplant sind
  const { data: allAssignments = [], isLoading: assignmentLoading } = useAllAssignments()
  const [activeTab, setActiveTab] = useState<'aufbau' | 'abbau'>('aufbau')
  
  const isLoading = projektLoading || assignmentLoading
  
  // Ermittle welche Projekte bereits Aufbau/Abbau haben
  const { projekteOhneAufbau, projekteOhneAbbau } = useMemo(() => {
    // Set mit Projekt-IDs die Aufbau haben
    const projekteMitAufbau = new Set<string>()
    // Set mit Projekt-IDs die Abbau haben
    const projekteMitAbbau = new Set<string>()
    
    // Prüfe alle Events (aus der gesamten Datenbank, nicht nur aktueller Zeitraum)
    allAssignments.forEach(event => {
      const projektId = event.projektId?.toString() || ''
      if (!projektId) return
      
      // Prüfe auf setupDate, dismantleDate, oder title/notes
      const title = (event.title || '').toLowerCase()
      const notes = (event.notes || '').toLowerCase()
      
      if (event.setupDate || title.includes('aufbau') || notes.includes('aufbau')) {
        projekteMitAufbau.add(projektId)
      }
      if (event.dismantleDate || title.includes('abbau') || notes.includes('abbau')) {
        projekteMitAbbau.add(projektId)
      }
    })
    
    // Filtere Projekte mit Status "in_planung" oder "aktiv"
    const alleProjekte = projekte.filter(p => ['in_planung', 'aktiv'].includes(p.status))
    
    return {
      projekteOhneAufbau: alleProjekte.filter(p => !projekteMitAufbau.has(p._id || '')),
      projekteOhneAbbau: alleProjekte.filter(p => !projekteMitAbbau.has(p._id || ''))
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
  
  return (
    <div className="w-[300px] border-l border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Nicht terminiert</h3>
          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
            {projektCount}
          </Badge>
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
