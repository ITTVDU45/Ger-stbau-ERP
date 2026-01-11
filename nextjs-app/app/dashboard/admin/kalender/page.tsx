'use client'

/**
 * Plantafel / Kalender Seite
 * 
 * Ressourcen-Kalender für Projekt- und Mitarbeitereinsatzplanung.
 * 
 * Features:
 * - Team-View: Zeilen = Mitarbeiter
 * - Projekt-View: Zeilen = Projekte
 * - Drag & Drop für Einsätze
 * - Konflikt-Erkennung
 * - Abwesenheiten (Urlaub/Krankheit)
 */

import dynamic from 'next/dynamic'
import { QueryProvider } from '@/providers/query-provider'

// PlantafelBoard mit Client-Only Rendering laden um Hydration-Probleme zu vermeiden
const PlantafelBoard = dynamic(
  () => import('@/components/plantafel/PlantafelBoard'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Lade Plantafel...</p>
        </div>
      </div>
    )
  }
)

export default function KalenderPage() {
  return (
    <QueryProvider>
      <PlantafelBoard />
    </QueryProvider>
  )
}
