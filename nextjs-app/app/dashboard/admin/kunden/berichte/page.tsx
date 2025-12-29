'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BarChart3, Calendar, Download } from 'lucide-react'
import { KundenberichtStats, KundenKennzahlen, ZeitraumFilter } from '@/lib/db/types'
import BerichtKPICards from './components/BerichtKPICards'
import BerichtKundenTabelle from './components/BerichtKundenTabelle'
import { exportKundenListeToPDF } from '@/lib/services/pdfExportService'
import { toast } from 'sonner'

export default function KundenberichtePage() {
  const [stats, setStats] = useState<KundenberichtStats | null>(null)
  const [kunden, setKunden] = useState<KundenKennzahlen[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  // Zeitraumfilter
  const [zeitraumTyp, setZeitraumTyp] = useState<ZeitraumFilter['typ']>('aktuelles_jahr')
  const [vonDatum, setVonDatum] = useState('')
  const [bisDatum, setBisDatum] = useState('')

  useEffect(() => {
    loadData()
  }, [zeitraumTyp, vonDatum, bisDatum])

  const loadData = async () => {
    try {
      setLoading(true)

      // Build query params
      const params = new URLSearchParams({
        zeitraumTyp
      })

      if (zeitraumTyp === 'benutzerdefiniert' && vonDatum && bisDatum) {
        params.append('von', vonDatum)
        params.append('bis', bisDatum)
      }

      // Lade Stats
      const statsResponse = await fetch(`/api/kunden/berichte/stats?${params}`)
      const statsData = await statsResponse.json()
      if (statsData.erfolg) {
        setStats(statsData.stats)
      } else {
        toast.error('Fehler beim Laden der Statistiken')
      }

      // Lade Kundenliste
      const kundenResponse = await fetch(`/api/kunden/berichte/liste?${params}`)
      const kundenData = await kundenResponse.json()
      if (kundenData.erfolg) {
        setKunden(kundenData.kunden)
      } else {
        toast.error('Fehler beim Laden der Kundenliste')
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error)
      toast.error('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (filter: string) => {
    setActiveFilter(activeFilter === filter ? null : filter)
  }

  const handleExport = () => {
    const zeitraumBeschreibung = getZeitraumBeschreibung()
    exportKundenListeToPDF(kunden, zeitraumBeschreibung)
    toast.success('PDF-Export erfolgreich!')
  }

  const getZeitraumBeschreibung = () => {
    const labels: Record<ZeitraumFilter['typ'], string> = {
      letzte_30_tage: 'Letzte 30 Tage',
      letzte_90_tage: 'Letzte 90 Tage',
      letztes_jahr: 'Letztes Jahr',
      aktuelles_jahr: 'Aktuelles Jahr',
      aktuelles_quartal: 'Aktuelles Quartal',
      vorjahr: 'Vorjahr',
      letztes_quartal: 'Letztes Quartal',
      benutzerdefiniert: 'Benutzerdefiniert'
    }
    return labels[zeitraumTyp]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-linear-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                Kundenberichte
              </CardTitle>
              <CardDescription className="text-gray-700">
                Übersicht über alle Kunden und deren Kennzahlen
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleExport}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportieren
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Zeitraumfilter */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            Zeitraumfilter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="zeitraum" className="text-gray-700 font-medium">
                Zeitraum
              </Label>
              <Select value={zeitraumTyp} onValueChange={(value) => setZeitraumTyp(value as ZeitraumFilter['typ'])}>
                <SelectTrigger id="zeitraum" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="letzte_30_tage">Letzte 30 Tage</SelectItem>
                  <SelectItem value="letzte_90_tage">Letzte 90 Tage</SelectItem>
                  <SelectItem value="letztes_jahr">Letztes Jahr (365 Tage)</SelectItem>
                  <SelectItem value="aktuelles_jahr">Aktuelles Jahr</SelectItem>
                  <SelectItem value="aktuelles_quartal">Aktuelles Quartal</SelectItem>
                  <SelectItem value="vorjahr">Vorjahr</SelectItem>
                  <SelectItem value="letztes_quartal">Letztes Quartal</SelectItem>
                  <SelectItem value="benutzerdefiniert">Benutzerdefiniert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {zeitraumTyp === 'benutzerdefiniert' && (
              <>
                <div>
                  <Label htmlFor="von" className="text-gray-700 font-medium">
                    Von
                  </Label>
                  <Input
                    id="von"
                    type="date"
                    value={vonDatum}
                    onChange={(e) => setVonDatum(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="bis" className="text-gray-700 font-medium">
                    Bis
                  </Label>
                  <Input
                    id="bis"
                    type="date"
                    value={bisDatum}
                    onChange={(e) => setBisDatum(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <Button onClick={loadData} className="w-full bg-blue-600 hover:bg-blue-700">
                Aktualisieren
              </Button>
            </div>
          </div>

          {activeFilter && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Aktiver Filter:</strong> {activeFilter === 'aktive' ? 'Aktive Kunden' : activeFilter === 'offene_rechnungen' ? 'Kunden mit offenen Rechnungen' : activeFilter === 'mahnung_offen' ? 'Kunden mit offener Mahnung' : activeFilter === 'top_umsatz' ? 'Top 10 Kunden nach Umsatz' : activeFilter === 'keine_aktivitaet' ? 'Kunden ohne Aktivität (90 Tage)' : activeFilter}
                {' '}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setActiveFilter(null)}
                  className="h-auto p-0 text-blue-700 underline"
                >
                  Filter entfernen
                </Button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI-Cards */}
      <BerichtKPICards stats={stats} onCardClick={handleCardClick} />

      {/* Top 5 Kunden */}
      {stats && stats.topKunden.length > 0 && (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">
              Top 5 Kunden nach Umsatz ({getZeitraumBeschreibung()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topKunden.map((kunde, index) => (
                <div
                  key={kunde.kundeId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{kunde.kundeName}</span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {kunde.umsatz.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kundentabelle */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">
            Kundenliste ({getZeitraumBeschreibung()})
          </CardTitle>
          <CardDescription className="text-gray-600">
            Alle Kunden mit ihren Kennzahlen im ausgewählten Zeitraum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BerichtKundenTabelle
            kunden={kunden}
            loading={loading}
            activeFilter={activeFilter}
          />
        </CardContent>
      </Card>
    </div>
  )
}
