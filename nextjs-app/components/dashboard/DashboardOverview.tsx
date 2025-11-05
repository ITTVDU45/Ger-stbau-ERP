"use client"

import React, { useEffect } from 'react'
import { UserRole } from '@/lib/auth/roles'
import { useDashboard } from '@/lib/contexts/DashboardContext'
import DashboardFilter from '@/components/DashboardFilter'
import DashboardCards from '@/components/DashboardCards'
import DashboardCharts from '@/components/DashboardCharts'
import DashboardTables from '@/components/DashboardTables'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface DashboardOverviewProps {
  role: UserRole
  user: {
    id: string
    role: UserRole
    name?: string
  }
}

export default function DashboardOverview({ role, user }: DashboardOverviewProps) {
  const { setDashboardData } = useDashboard()

  // Daten laden (via API Route)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Lade Daten von der API Route (server-side)
        const response = await fetch(`/api/dashboard/stats?userId=${user.id}&role=${role}`)
        const result = await response.json()

        if (result.erfolg && result.data) {
          // Type-cast für TypeScript
          const typedData = {
            cards: result.data.cards.map((card: any) => ({
              ...card,
              type: card.type as 'count' | 'currency'
            })),
            charts: result.data.charts.map((chart: any) => ({
              ...chart,
              type: chart.type as 'donut' | 'line' | 'pie' | 'map'
            })),
            tables: result.data.tables.map((table: any) => ({
              ...table,
              type: table.type as 'tasks' | 'cases' | 'documents' | 'partners',
              columns: table.columns.map((col: any) => ({
                ...col,
                type: col.type as 'text' | 'number' | 'date' | 'status' | undefined
              }))
            }))
          }

          setDashboardData(typedData)
        } else {
          throw new Error(result.nachricht || 'Fehler beim Laden der Daten')
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        // Fallback zu Mock-Daten falls Datenbank nicht verfügbar
        const cards = role === 'ADMIN' ? [
          { id: 'active-cases', title: 'Aktive Fälle', value: 0, type: 'count' as const, color: '#10b981' },
          { id: 'completed-cases', title: 'Abgeschlossene Fälle', value: 0, type: 'count' as const, color: '#8b5cf6' },
          { id: 'open-tasks', title: 'Offene Aufgaben', value: 0, type: 'count' as const, color: '#f59e0b' },
          { id: 'total-cases', title: 'Gesamtfälle', value: 0, type: 'count' as const, color: '#6b7280' },
          { id: 'gutachter-sum', title: 'Gutachter-Summe (abgeschlossen)', value: '0 €', type: 'currency' as const, color: '#f59e0b' },
          { id: 'billing-active', title: 'Abrechnung (aktiv & laufend)', value: '0 €', type: 'currency' as const, color: '#3b82f6' },
          { id: 'referrals', title: 'Vermittlungen über Referenznummern', value: 0, type: 'count' as const, color: '#06b6d4' }
        ] : [
          { id: 'active-cases', title: 'Aktive Fälle', value: 0, type: 'count' as const, color: '#10b981' },
          { id: 'completed-cases', title: 'Abgeschlossene Fälle', value: 0, type: 'count' as const, color: '#8b5cf6' },
          { id: 'open-tasks', title: 'Offene Aufgaben', value: 0, type: 'count' as const, color: '#f59e0b' },
          { id: 'total-cases', title: 'Gesamtfälle', value: 0, type: 'count' as const, color: '#6b7280' },
          { id: 'gutachter-sum', title: 'Gutachter-Summe (abgeschlossen)', value: '0 €', type: 'currency' as const, color: '#f59e0b' },
          { id: 'billing-active', title: 'Abrechnung (aktiv & laufend)', value: '0 €', type: 'currency' as const, color: '#3b82f6' }
        ]

        const charts = [
          {
            id: 'status-distribution',
            title: 'Statusverteilung der Fälle',
            type: 'donut' as const,
            data: []
          },
          {
            id: 'monthly-revenue',
            title: 'Monatliche Gutachter-Umsätze',
            type: 'line' as const,
            data: []
          },
          {
            id: 'vehicle-types',
            title: 'Fahrzeugarten-Statistik',
            type: 'pie' as const,
            data: []
          },
          {
            id: 'location-map',
            title: 'Fallverteilung nach Standort',
            type: 'map' as const,
            data: []
          }
        ]

        const tables = [
          {
            id: 'tasks',
            title: 'Offene Aufgaben',
            type: 'tasks' as const,
            columns: [
              { key: 'titel', label: 'Aufgabe', type: 'text' as const },
              { key: 'prioritaet', label: 'Priorität', type: 'status' as const },
              { key: 'faelligAm', label: 'Fällig bis', type: 'date' as const }
            ],
            data: []
          },
          {
            id: 'cases',
            title: 'Abgerechnete Fälle',
            type: 'cases' as const,
            columns: [
              { key: 'fallId', label: 'Fall-ID', type: 'text' as const },
              { key: 'fallname', label: 'Mandant', type: 'text' as const },
              { key: 'betrag', label: 'Betrag', type: 'number' as const },
              { key: 'faelligAm', label: 'Datum', type: 'date' as const }
            ],
            data: []
          },
          {
            id: 'documents',
            title: 'Letzte Dokumente',
            type: 'documents' as const,
            columns: [
              { key: 'dateiname', label: 'Dokumentname', type: 'text' as const },
              { key: 'kategorie', label: 'Kategorie', type: 'text' as const },
              { key: 'hochgeladenAm', label: 'Hochgeladen', type: 'date' as const }
            ],
            data: []
          },
          {
            id: 'partners',
            title: 'Partnervermittlungen',
            type: 'partners' as const,
            columns: [
              { key: 'referenzNummer', label: 'Ref-ID', type: 'text' as const },
              { key: 'partner', label: 'Partner', type: 'text' as const },
              { key: 'vermitteltAm', label: 'Datum', type: 'date' as const }
            ],
            data: []
          }
        ]

        setDashboardData({ cards, charts, tables })
      }
    }

    loadData()
  }, [role, user.id])

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="card-gradient-blue border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl">
                Willkommen zurück, {user.name || 'Benutzer'}!
              </CardTitle>
              <CardDescription className="text-white/80">
                {role === 'ADMIN' ? 'Administrationsübersicht' :
                 role === 'GUTACHTER' ? 'Personalvermittlungs CRM System' :
                 'Partner-Dashboard'}
              </CardDescription>
            </div>
            <div className="flex gap-3">
              {role === 'GUTACHTER' && (
                <Button asChild className="btn-gradient-green">
                  <Link href="/dashboard/gutachter/faelle">Alle Fälle einsehen</Link>
                </Button>
              )}
              {role === 'ADMIN' && (
                <Button asChild className="btn-gradient-green">
                  <Link href="/dashboard/admin/faelle">Alle Fälle</Link>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filter */}
      <DashboardFilter />

      {/* KPI Cards */}
      <DashboardCards />

      {/* Charts */}
      <DashboardCharts />

      {/* Tables */}
      <DashboardTables />
    </div>
  )
}
