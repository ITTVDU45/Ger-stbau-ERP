'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Projekt, Vorkalkulation, Nachkalkulation } from '@/lib/db/types'
import MonatsResultat from './kalkulation/MonatsResultat'
import VorkalkulationEditor from './kalkulation/VorkalkulationEditor'
import NachkalkulationAnzeige from './kalkulation/NachkalkulationAnzeige'
import MitarbeiterKalkulationTabelle from './kalkulation/MitarbeiterKalkulationTabelle'
import KalkulationsVerlaufCharts from './kalkulation/KalkulationsVerlaufCharts'
import EinheitspreisPositionen from './kalkulation/EinheitspreisPositionen'
import { toast } from 'sonner'

interface ProjektKalkulationTabProps {
  projekt: Projekt
  onProjektUpdated?: () => void
}

export default function ProjektKalkulationTab({ projekt, onProjektUpdated }: ProjektKalkulationTabProps) {
  const [loading, setLoading] = useState(true)
  const [vorkalkulation, setVorkalkulation] = useState<Vorkalkulation | undefined>(projekt.vorkalkulation)
  const [nachkalkulation, setNachkalkulation] = useState<Nachkalkulation | undefined>(projekt.nachkalkulation)
  const [angebotNetto, setAngebotNetto] = useState<number | undefined>(undefined)
  const [activeTab, setActiveTab] = useState('vorkalkulation')
  const [plantafelEinsaetze, setPlantafelEinsaetze] = useState<any[]>([])

  useEffect(() => {
    console.log('=== ProjektKalkulationTab ===')
    console.log('Projekt ID:', projekt._id)
    console.log('Angebot ID:', projekt.angebotId)
    console.log('Angebotsnummer:', projekt.angebotsnummer)
    console.log('Budget (Projekt):', projekt.budget)
    console.log('Angebotssumme (Projekt):', projekt.angebotssumme)
    console.log('Vollständiges Projekt:', projekt)

    loadKalkulation()
    loadPlantafelEinsaetze()

    if (projekt.angebotId) {
      console.log('→ Lade Angebot:', projekt.angebotId)
      loadAngebot()
    } else {
      // Kein Angebot zugewiesen - versuche automatisch zuzuweisen
      console.log('⚠ Kein Angebot zugewiesen - prüfe ob automatische Zuweisung möglich ist')
      autoZuweiseAngebot()
    }
  }, [projekt._id, projekt.angebotId])

  // Lade Einsätze aus der Plantafel für dieses Projekt
  const loadPlantafelEinsaetze = async () => {
    try {
      const response = await fetch(`/api/einsatz?projektId=${projekt._id}`)
      if (response.ok) {
        const data = await response.json()
        const einsaetze = data.einsaetze || data || []
        console.log('[ProjektKalkulationTab] Plantafel-Einsätze geladen:', einsaetze.length)
        setPlantafelEinsaetze(einsaetze)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Plantafel-Einsätze:', error)
    }
  }

  // Kombiniere zugewiesene Mitarbeiter aus Projekt UND Plantafel-Einsätzen
  const alleMitarbeiter = useMemo(() => {
    const mitarbeiterMap = new Map<string, any>()
    
    // 1. Füge manuell zugewiesene Mitarbeiter hinzu
    projekt.zugewieseneMitarbeiter?.forEach((m, index) => {
      const key = m.mitarbeiterId
      mitarbeiterMap.set(key, {
        ...m,
        quelle: 'manuell',
        index,
        setupDate: undefined,
        dismantleDate: undefined
      })
    })
    
    // 2. Füge Mitarbeiter aus Plantafel-Einsätzen hinzu
    plantafelEinsaetze.forEach(einsatz => {
      if (!einsatz.mitarbeiterId) return
      
      const key = einsatz.mitarbeiterId
      const existing = mitarbeiterMap.get(key)
      
      if (existing) {
        // Aktualisiere mit Plantafel-Daten
        existing.setupDate = existing.setupDate || einsatz.setupDate
        existing.dismantleDate = existing.dismantleDate || einsatz.dismantleDate
        existing.quelle = 'beide'
        // Markiere als Aufbau/Abbau Mitarbeiter basierend auf Einsatz-Daten
        if (einsatz.setupDate) {
          existing.stundenAufbau = existing.stundenAufbau || 8 // Default 8h für Aufbau
        }
        if (einsatz.dismantleDate) {
          existing.stundenAbbau = existing.stundenAbbau || 8 // Default 8h für Abbau
        }
      } else {
        // Neuer Mitarbeiter aus Plantafel
        mitarbeiterMap.set(key, {
          mitarbeiterId: einsatz.mitarbeiterId,
          mitarbeiterName: einsatz.mitarbeiterName || 'Unbekannt',
          rolle: einsatz.rolle || 'helfer',
          von: einsatz.setupDate ? new Date(einsatz.setupDate) : undefined,
          bis: einsatz.dismantleDate ? new Date(einsatz.dismantleDate) : undefined,
          setupDate: einsatz.setupDate,
          dismantleDate: einsatz.dismantleDate,
          quelle: 'plantafel',
          einsatzId: einsatz._id,
          // Setze Stunden basierend auf Einsatz-Typ
          stundenAufbau: einsatz.setupDate ? 8 : 0,
          stundenAbbau: einsatz.dismantleDate ? 8 : 0
        })
      }
    })
    
    const result = Array.from(mitarbeiterMap.values())
    console.log('[ProjektKalkulationTab] Alle Mitarbeiter kombiniert:', result.length, 
      'davon Plantafel:', result.filter(m => m.quelle === 'plantafel' || m.quelle === 'beide').length)
    return result
  }, [projekt.zugewieseneMitarbeiter, plantafelEinsaetze])

  const loadKalkulation = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kalkulation/${projekt._id}`)
      const data = await response.json()
      
      if (data.erfolg) {
        setVorkalkulation(data.vorkalkulation)
        setNachkalkulation(data.nachkalkulation)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kalkulation:', error)
      toast.error('Fehler beim Laden der Kalkulation')
    } finally {
      setLoading(false)
    }
  }

  const autoZuweiseAngebot = async () => {
    try {
      console.log('🔍 Suche nach angenommenen Angeboten für automatische Zuweisung...')
      
      // Lade angenommene Angebote für diesen Kunden
      const response = await fetch(`/api/projekte/${projekt._id}/angebote`)
      const data = await response.json()
      
      if (data.erfolg && data.angebote && data.angebote.length > 0) {
        // Filter: Nur angenommene Angebote ohne Projekt
        const verfuegbareAngebote = data.angebote.filter((a: any) => 
          a.status === 'angenommen' && !a.projektId
        )
        
        console.log(`→ ${verfuegbareAngebote.length} verfügbare Angebot(e) gefunden`)
        
        if (verfuegbareAngebote.length === 1) {
          // Genau 1 Angebot gefunden → automatisch zuweisen
          const angebot = verfuegbareAngebote[0]
          console.log(`✓ Weise Angebot ${angebot.angebotsnummer} automatisch zu`)
          
          const zuweisungResponse = await fetch(`/api/projekte/${projekt._id}/angebot-zuweisen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              angebotId: angebot._id,
              benutzer: 'auto'
            })
          })
          
          const zuweisungData = await zuweisungResponse.json()
          
          if (zuweisungData.erfolg) {
            toast.success('Angebot automatisch zugewiesen', {
              description: `Angebot ${angebot.angebotsnummer} wurde automatisch mit diesem Projekt verknüpft`
            })
            
            // Projekt neu laden
            if (onProjektUpdated) {
              onProjektUpdated()
            }
          } else {
            console.warn('⚠ Automatische Zuweisung fehlgeschlagen:', zuweisungData.fehler)
            setAngebotNetto(projekt.budget || projekt.angebotssumme)
          }
        } else if (verfuegbareAngebote.length > 1) {
          console.log('ℹ Mehrere Angebote verfügbar - keine automatische Zuweisung')
          setAngebotNetto(projekt.budget || projekt.angebotssumme)
        } else {
          console.log('ℹ Keine verfügbaren Angebote für automatische Zuweisung')
          setAngebotNetto(projekt.budget || projekt.angebotssumme)
        }
      } else {
        console.log('ℹ Keine Angebote gefunden')
        setAngebotNetto(projekt.budget || projekt.angebotssumme)
      }
    } catch (error) {
      console.error('❌ Fehler bei automatischer Angebotszuweisung:', error)
      setAngebotNetto(projekt.budget || projekt.angebotssumme)
    }
  }

  const loadAngebot = async () => {
    try {
      console.log('Starte Angebot-Laden von API:', `/api/angebote/${projekt.angebotId}`)
      const response = await fetch(`/api/angebote/${projekt.angebotId}`)
      const data = await response.json()
      
      console.log('Angebot API Response:', data)
      
      if (data.erfolg && data.angebot) {
        // Berechne Netto OHNE Einheitspreise (E.P. / Miete)
        const nettoOhneEP = data.angebot.positionen
          ?.filter((pos: any) => 
            pos.preisTyp !== 'einheitspreis' && 
            pos.typ !== 'miete'
          )
          .reduce((sum: number, pos: any) => sum + (pos.gesamtpreis || 0), 0) || data.angebot.netto
        
        console.log(`✓ Angebot geladen - Netto gesamt: ${data.angebot.netto}, Netto ohne E.P./Miete: ${nettoOhneEP}`)
        setAngebotNetto(nettoOhneEP)
      } else {
        console.log('⚠ Angebot nicht gefunden - verwende Projekt-Budget:', projekt.budget)
        setAngebotNetto(projekt.budget)
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Angebots:', error)
      // Fallback auf Projekt-Budget
      console.log('→ Fallback auf Projekt-Budget:', projekt.budget)
      setAngebotNetto(projekt.budget)
    }
  }

  const handleUpdate = async () => {
    await loadKalkulation()
    if (onProjektUpdated) {
      onProjektUpdated()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Monatsresultat - Immer sichtbar oben */}
      <MonatsResultat 
        vorkalkulation={vorkalkulation}
        nachkalkulation={nachkalkulation}
      />

      {/* Tabs für Vorkalkulation, Nachkalkulation, Mitarbeiter, Verlauf */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap gap-2 bg-gray-100">
          <TabsTrigger value="vorkalkulation" className="data-[state=active]:bg-white flex-shrink-0">
            Vorkalkulation
          </TabsTrigger>
          <TabsTrigger value="nachkalkulation" className="data-[state=active]:bg-white flex-shrink-0">
            Nachkalkulation
          </TabsTrigger>
          <TabsTrigger value="einheitspreise" className="data-[state=active]:bg-white flex-shrink-0">
            Einheitspreise (E.P.)
          </TabsTrigger>
          <TabsTrigger value="mitarbeiter" className="data-[state=active]:bg-white flex-shrink-0">
            Mitarbeiter-Abgleich
          </TabsTrigger>
          <TabsTrigger value="verlauf" className="data-[state=active]:bg-white flex-shrink-0">
            Verlauf & Charts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vorkalkulation" className="mt-6">
          <VorkalkulationEditor
            projektId={projekt._id!}
            vorkalkulation={vorkalkulation}
            angebotId={projekt.angebotId}
            angebotssumme={angebotNetto || projekt.budget || projekt.angebotssumme}
            zugewieseneMitarbeiter={alleMitarbeiter}
            onUpdate={handleUpdate}
          />
        </TabsContent>

        <TabsContent value="nachkalkulation" className="mt-6">
          <NachkalkulationAnzeige
            projektId={projekt._id!}
            vorkalkulation={vorkalkulation}
            nachkalkulation={nachkalkulation}
            zugewieseneMitarbeiter={alleMitarbeiter}
            onUpdate={handleUpdate}
          />
        </TabsContent>

        <TabsContent value="einheitspreise" className="mt-6">
          <EinheitspreisPositionen
            projektId={projekt._id!}
            angebotId={projekt.angebotId}
            onUpdate={handleUpdate}
          />
        </TabsContent>

        <TabsContent value="mitarbeiter" className="mt-6">
          <MitarbeiterKalkulationTabelle
            mitarbeiterKalkulation={nachkalkulation?.mitarbeiterAuswertung || []}
          />
        </TabsContent>

        <TabsContent value="verlauf" className="mt-6">
          <KalkulationsVerlaufCharts
            projekt={projekt}
            vorkalkulation={vorkalkulation}
            nachkalkulation={nachkalkulation}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

