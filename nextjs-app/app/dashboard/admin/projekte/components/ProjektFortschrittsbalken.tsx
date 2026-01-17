'use client'

/**
 * ProjektFortschrittsbalken
 * 
 * Zeigt den aktuellen Projektfortschritt als visuellen Balken an.
 * Schritte: Anfrage → Angebot → Team → Aufbau → Rechnung → Abbau → Abschluss
 */

import { useMemo, useEffect, useState } from 'react'
import { Projekt } from '@/lib/db/types'
import { cn } from '@/lib/utils'
import { 
  MessageSquare, 
  FileText, 
  Users, 
  Hammer, 
  Receipt, 
  Truck, 
  CheckCircle2,
  Circle,
  Check
} from 'lucide-react'

interface ProjektFortschrittsbalkenProps {
  projekt: Projekt
}

interface FortschrittsSchritt {
  id: string
  label: string
  icon: React.ReactNode
  status: 'completed' | 'current' | 'pending'
  tooltip?: string
}

export default function ProjektFortschrittsbalken({ projekt }: ProjektFortschrittsbalkenProps) {
  const [rechnungenCount, setRechnungenCount] = useState(0)
  const [hatBezahlteRechnungen, setHatBezahlteRechnungen] = useState(false)

  // Lade Rechnungen-Info
  useEffect(() => {
    const loadRechnungen = async () => {
      try {
        const res = await fetch(`/api/rechnungen?projektId=${projekt._id}`)
        const data = await res.json()
        if (data.success && data.rechnungen) {
          setRechnungenCount(data.rechnungen.length)
          const bezahlt = data.rechnungen.some((r: any) => r.status === 'bezahlt')
          setHatBezahlteRechnungen(bezahlt)
        }
      } catch (error) {
        console.error('Fehler beim Laden der Rechnungen:', error)
      }
    }
    
    if (projekt._id) {
      loadRechnungen()
    }
  }, [projekt._id])

  const schritte = useMemo((): FortschrittsSchritt[] => {
    // Bestimme den Status jedes Schritts individuell basierend auf Projektdaten
    const hatAnfrage = !!(projekt.anfrageIds && projekt.anfrageIds.length > 0)
    const hatAngebot = !!(projekt.angebotId && projekt.angebotId.length > 0)
    const hatTeam = !!(projekt.zugewieseneMitarbeiter && projekt.zugewieseneMitarbeiter.length > 0)
    const istAktiv = projekt.status === 'aktiv' || projekt.status === 'in_abrechnung' || projekt.status === 'abgeschlossen'
    const hatRechnung = rechnungenCount > 0 || (projekt.bereitsAbgerechnet && projekt.bereitsAbgerechnet > 0)
    const istAbgeschlossen = projekt.status === 'abgeschlossen'
    
    // Aufbau: Projekt muss aktiv sein UND Team zugewiesen
    const aufbauErfolgt = istAktiv && hatTeam
    // Abbau: Projekt ist abgeschlossen
    const abbauErfolgt = istAbgeschlossen

    // Jeder Schritt hat seinen eigenen "erledigt"-Status
    const schrittStatus: boolean[] = [
      hatAnfrage,      // 0: Anfrage
      hatAngebot,      // 1: Angebot
      hatTeam,         // 2: Team
      aufbauErfolgt,   // 3: Aufbau
      !!hatRechnung,   // 4: Rechnung
      abbauErfolgt,    // 5: Abbau
      istAbgeschlossen // 6: Abschluss
    ]

    // Finde den ersten nicht erledigten Schritt (= aktueller Schritt)
    let currentStepIndex = schrittStatus.findIndex(status => !status)
    if (currentStepIndex === -1) currentStepIndex = schrittStatus.length // Alle erledigt

    const getStatus = (index: number, isCompleted: boolean): 'completed' | 'current' | 'pending' => {
      if (isCompleted) return 'completed'
      if (index === currentStepIndex) return 'current'
      return 'pending'
    }

    return [
      {
        id: 'anfrage',
        label: 'Anfrage',
        icon: <MessageSquare className="h-4 w-4" />,
        status: getStatus(0, hatAnfrage),
        tooltip: hatAnfrage ? `${projekt.anfrageIds?.length} Anfrage(n) verknüpft` : 'Noch keine Anfrage'
      },
      {
        id: 'angebot',
        label: 'Angebot',
        icon: <FileText className="h-4 w-4" />,
        status: getStatus(1, hatAngebot),
        tooltip: hatAngebot ? `Angebot ${projekt.angebotsnummer || 'vorhanden'}` : 'Kein Angebot erstellt'
      },
      {
        id: 'team',
        label: 'Team',
        icon: <Users className="h-4 w-4" />,
        status: getStatus(2, hatTeam),
        tooltip: hatTeam ? `${projekt.zugewieseneMitarbeiter?.length} Mitarbeiter zugewiesen` : 'Keine Mitarbeiter zugewiesen'
      },
      {
        id: 'aufbau',
        label: 'Aufbau',
        icon: <Hammer className="h-4 w-4" />,
        status: getStatus(3, aufbauErfolgt),
        tooltip: aufbauErfolgt ? 'Gerüst aufgebaut' : 'Aufbau steht noch aus'
      },
      {
        id: 'rechnung',
        label: 'Rechnung',
        icon: <Receipt className="h-4 w-4" />,
        status: getStatus(4, !!hatRechnung),
        tooltip: hatRechnung 
          ? `${rechnungenCount} Rechnung(en)${hatBezahlteRechnungen ? ' (bezahlt)' : ''}`
          : 'Keine Rechnung erstellt'
      },
      {
        id: 'abbau',
        label: 'Abbau',
        icon: <Truck className="h-4 w-4" />,
        status: getStatus(5, abbauErfolgt),
        tooltip: abbauErfolgt ? 'Gerüst abgebaut' : 'Abbau steht noch aus'
      },
      {
        id: 'abschluss',
        label: 'Abschluss',
        icon: <CheckCircle2 className="h-4 w-4" />,
        status: getStatus(6, istAbgeschlossen),
        tooltip: istAbgeschlossen ? 'Projekt abgeschlossen' : 'Projekt läuft noch'
      }
    ]
  }, [projekt, rechnungenCount, hatBezahlteRechnungen])

  // Berechne Fortschritt in Prozent
  const completedCount = schritte.filter(s => s.status === 'completed').length
  const fortschrittProzent = Math.round((completedCount / schritte.length) * 100)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Projektfortschritt</h3>
        <span className="text-sm font-medium text-blue-600">{fortschrittProzent}% abgeschlossen</span>
      </div>

      {/* Fortschrittsbalken */}
      <div className="relative pt-2">
        {/* Schritte */}
        <div className="relative flex justify-between">
          {/* Hintergrund-Linie - zentriert in den Kreisen (36px/2 = 18px - 1px für Linie) */}
          <div className="absolute top-[17px] left-[20px] right-[20px] h-0.5 bg-gray-200 z-0" />
          
          {/* Fortschritts-Linie */}
          <div 
            className="absolute top-[17px] left-[20px] h-0.5 bg-blue-500 transition-all duration-500 z-0"
            style={{ width: `calc(${fortschrittProzent}% - 40px)` }}
          />
          {schritte.map((schritt, index) => (
            <div 
              key={schritt.id}
              className="flex flex-col items-center group"
              title={schritt.tooltip}
            >
              {/* Icon-Kreis */}
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10",
                schritt.status === 'completed' && "bg-blue-500 border-blue-500 text-white",
                schritt.status === 'current' && "bg-white border-blue-500 text-blue-500 ring-4 ring-blue-100",
                schritt.status === 'pending' && "bg-white border-gray-300 text-gray-400"
              )}>
                {schritt.status === 'completed' ? (
                  <Check className="h-5 w-5" />
                ) : (
                  schritt.icon
                )}
              </div>

              {/* Label */}
              <span className={cn(
                "mt-2 text-xs font-medium text-center whitespace-nowrap transition-colors",
                schritt.status === 'completed' && "text-blue-600",
                schritt.status === 'current' && "text-blue-600 font-semibold",
                schritt.status === 'pending' && "text-gray-400"
              )}>
                {schritt.label}
              </span>

              {/* Tooltip bei Hover */}
              <div className="absolute top-full mt-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  {schritt.tooltip}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
