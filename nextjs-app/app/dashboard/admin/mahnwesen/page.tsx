'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, BarChart3 } from 'lucide-react'
import MahnwesenKPICards, { MahnwesenStats } from './components/MahnwesenKPICards'
import MahnungenTabelle from './components/MahnungenTabelle'
import MahnungErstellenDialog from './components/MahnungErstellenDialog'
import { toast } from 'sonner'

export default function MahnwesenPage() {
  const router = useRouter()
  const [stats, setStats] = useState<MahnwesenStats>({
    aktiveMahnungen: 0,
    gesendeteMahnungen: 0,
    offeneMahnungen: 0,
    ueberfaelligeRechnungen: 0,
    gesperrteKunden: 0,
    zurGenehmigung: 0,
    abgelehnteMahnungen: 0,
    offenerGesamtbetrag: 0
  })
  const [mahnungen, setMahnungen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Lade Stats und Mahnungen parallel
      const [statsResponse, mahnungenResponse] = await Promise.all([
        fetch('/api/mahnwesen/stats'),
        fetch('/api/mahnwesen')
      ])

      const statsData = await statsResponse.json()
      const mahnungenData = await mahnungenResponse.json()

      if (statsData.erfolg) {
        setStats(statsData.stats)
      }

      if (mahnungenData.erfolg) {
        setMahnungen(mahnungenData.mahnungen)
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error)
      toast.error('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (filter: string) => {
    setActiveFilter(filter === activeFilter ? null : filter)
  }

  const handleDelete = () => {
    loadData() // Daten neu laden nach Löschen
  }

  // Filtere Mahnungen basierend auf aktivem Filter
  const gefilterteMahnungen = activeFilter
    ? mahnungen.filter((m) => {
        switch (activeFilter) {
          case 'aktiv':
            return ['erstellt', 'zur_genehmigung', 'genehmigt', 'versendet'].includes(
              m.status
            )
          case 'gesendet':
            return m.status === 'versendet'
          case 'offen':
            return m.status === 'versendet' && new Date(m.faelligAm) < new Date()
          case 'genehmigung':
            return m.genehmigung?.status === 'ausstehend'
          case 'abgelehnt':
            return m.genehmigung?.status === 'abgelehnt'
          default:
            return true
        }
      })
    : mahnungen

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-white min-h-screen">
      {/* Header */}
      <Card className="bg-white border-gray-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900">Mahnwesen</CardTitle>
              <CardDescription className="text-gray-700">
                Verwalten Sie Mahnungen und überfällige Rechnungen
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push('/dashboard/admin/mahnwesen/reports')}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports & Analytics
              </Button>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Neue Mahnung
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <MahnwesenKPICards stats={stats} onCardClick={handleCardClick} />

      {/* Active Filter Indicator */}
      {activeFilter && (
        <Card className="bg-blue-50 border-blue-300">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-900">
                Filter aktiv:{' '}
                <span className="font-semibold">
                  {activeFilter === 'aktiv' && 'Aktive Mahnungen'}
                  {activeFilter === 'gesendet' && 'Gesendete Mahnungen'}
                  {activeFilter === 'offen' && 'Offene Mahnungen'}
                  {activeFilter === 'genehmigung' && 'Zur Genehmigung'}
                  {activeFilter === 'abgelehnt' && 'Abgelehnte Mahnungen'}
                </span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveFilter(null)}
                className="text-gray-700 hover:text-gray-900"
              >
                Filter entfernen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mahnungen Tabelle */}
      <Card className="bg-white border-gray-300">
        <CardHeader>
          <CardTitle className="text-gray-900">Alle Mahnungen</CardTitle>
          <CardDescription className="text-gray-700">
            Übersicht aller Mahnungen mit Filter- und Sortiermöglichkeiten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MahnungenTabelle
            mahnungen={gefilterteMahnungen}
            onDelete={handleDelete}
            onRefresh={loadData}
          />
        </CardContent>
      </Card>

      {/* Mahnung-Erstellen-Dialog */}
      <MahnungErstellenDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadData}
      />
    </div>
  )
}

