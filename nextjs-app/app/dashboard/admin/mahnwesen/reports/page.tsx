'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Target, DollarSign, Users, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function MahnwesenReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/mahnwesen/reports')
      const data = await response.json()

      if (data.erfolg) {
        setReports(data.reports)
      } else {
        toast.error('Fehler beim Laden der Reports')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden der Reports')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!reports) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-600">Keine Reports verfügbar</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mahnwesen Reports & Analytics</h1>
            <p className="text-sm text-gray-600">Auswertungen und Statistiken</p>
          </div>
        </div>
        <Button onClick={loadReports} variant="outline">
          Aktualisieren
        </Button>
      </div>

      {/* KPI-Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erfolgsrate</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reports.erfolgsrate}%
            </div>
            <p className="text-xs text-gray-600">Bezahlte Mahnungen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Zahlungsdauer</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {reports.durchschnittlicheZahlungsdauer} Tage
            </div>
            <p className="text-xs text-gray-600">Nach Mahnungsversand</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Bearbeitungszeit</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {reports.durchschnittlicheBearbeitungszeit}h
            </div>
            <p className="text-xs text-gray-600">Erstellung bis Versand</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gebühren (Monat)</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {reports.gebuehren.gesamt.toLocaleString('de-DE', {
                minimumFractionDigits: 2
              })}{' '}
              €
            </div>
            <p className="text-xs text-gray-600">
              Mahngebühren + Zinsen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Mahnungen pro Mahnstufe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Mahnungen pro Mahnstufe</CardTitle>
            <CardDescription>Verteilung nach Mahnstufen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.mahnungenProMahnstufe.map((item: any) => (
                <div key={item._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        item._id === 1
                          ? 'bg-yellow-100 text-yellow-800'
                          : item._id === 2
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      Stufe {item._id}
                    </Badge>
                    <span className="text-sm text-gray-700">{item.anzahl} Mahnungen</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {item.gesamtforderung.toLocaleString('de-DE', {
                      minimumFractionDigits: 2
                    })}{' '}
                    €
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status-Verteilung */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Status-Verteilung</CardTitle>
            <CardDescription>Aktueller Stand aller Mahnungen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reports.statusVerteilung.map((item: any) => (
                <div key={item._id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">
                    {item._id.replace('_', ' ')}
                  </span>
                  <Badge variant="outline">{item.anzahl}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mahnungen-Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Mahnungen-Trend (6 Monate)</CardTitle>
          <CardDescription>Erstellte, versendete und bezahlte Mahnungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.mahnungenTrend.map((month: any) => (
              <div key={month.monat} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{month.monat}</span>
                  <div className="flex gap-4">
                    <span className="text-blue-600">Erstellt: {month.erstellt}</span>
                    <span className="text-purple-600">Versendet: {month.versendet}</span>
                    <span className="text-green-600">Bezahlt: {month.bezahlt}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${month.erstellt > 0 ? (month.bezahlt / month.erstellt) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Offene Forderungen nach Alter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Offene Forderungen nach Alter</CardTitle>
          <CardDescription>Alterung der ausstehenden Beträge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-gray-700">{'< 30 Tage'}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {reports.forderungenNachAlter.unter30Tage.anzahl}
              </p>
              <p className="text-sm text-gray-600">
                {reports.forderungenNachAlter.unter30Tage.betrag.toLocaleString('de-DE', {
                  minimumFractionDigits: 2
                })}{' '}
                €
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium text-gray-700">30-60 Tage</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {reports.forderungenNachAlter['30bis60Tage'].anzahl}
              </p>
              <p className="text-sm text-gray-600">
                {reports.forderungenNachAlter['30bis60Tage'].betrag.toLocaleString('de-DE', {
                  minimumFractionDigits: 2
                })}{' '}
                €
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-sm font-medium text-gray-700">60-90 Tage</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {reports.forderungenNachAlter['60bis90Tage'].anzahl}
              </p>
              <p className="text-sm text-gray-600">
                {reports.forderungenNachAlter['60bis90Tage'].betrag.toLocaleString('de-DE', {
                  minimumFractionDigits: 2
                })}{' '}
                €
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-gray-700">{'>'}  90 Tage</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {reports.forderungenNachAlter.ueber90Tage.anzahl}
              </p>
              <p className="text-sm text-gray-600">
                {reports.forderungenNachAlter.ueber90Tage.betrag.toLocaleString('de-DE', {
                  minimumFractionDigits: 2
                })}{' '}
                €
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Kunden */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-red-600" />
            Top 10 Kunden mit häufigsten Mahnungen
          </CardTitle>
          <CardDescription>Kunden mit dem höchsten Mahnungsaufkommen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.topKunden.map((kunde: any, index: number) => (
              <div
                key={kunde._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={
                      index === 0
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : index === 1
                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                        : index === 2
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        : ''
                    }
                  >
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium text-gray-900">{kunde.kundeName}</p>
                    <p className="text-sm text-gray-600">
                      {kunde.anzahlMahnungen} Mahnungen
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-gray-900">
                  {kunde.gesamtforderung.toLocaleString('de-DE', {
                    minimumFractionDigits: 2
                  })}{' '}
                  €
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

