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

import { QueryProvider } from '@/providers/query-provider'
import PlantafelBoard from '@/components/plantafel/PlantafelBoard'

export default function KalenderPage() {
  return (
    <QueryProvider>
      <PlantafelBoard />
    </QueryProvider>
  )
}
