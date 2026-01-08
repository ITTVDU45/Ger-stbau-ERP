'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ZeitraumFilter } from '@/lib/db/types'

interface ChartsSectionProps {
  zeitraum: ZeitraumFilter
  mandantId?: string | null
  refreshTrigger?: number
}

export default function ChartsSection({ zeitraum, mandantId, refreshTrigger }: ChartsSectionProps) {
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any>(null)

  useEffect(() => {
    loadChartData()
  }, [zeitraum, mandantId, refreshTrigger])

  const loadChartData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        von: zeitraum.von?.toISOString() || '',
        bis: zeitraum.bis?.toISOString() || '',
        intervall: 'tag'
      })
      if (mandantId) params.append('mandantId', mandantId)

      console.log('📊 Lade Chart-Daten mit Parametern:', {
        von: zeitraum.von?.toISOString(),
        bis: zeitraum.bis?.toISOString(),
        mandantId
      })

      const res = await fetch(`/api/finanzen/charts?${params}`)
      const data = await res.json()

      console.log('📊 Chart-Daten erhalten:', {
        erfolg: data.erfolg,
        zeitreiheAnzahl: data.charts?.zeitreihe?.length || 0,
        zeitreiheBeispiel: data.charts?.zeitreihe?.slice(0, 3),
        kategorienAnzahl: data.charts?.kategorienAusgaben?.length || 0
      })

      if (data.erfolg) {
        setChartData(data.charts)
      } else {
        console.error('❌ Chart-Daten Fehler:', data.fehler)
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Chart-Daten:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6']

  if (loading) {
    return (
      <Card className="p-6 bg-white border-2 border-gray-200">
        <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
      </Card>
    )
  }

  if (!chartData || !chartData.zeitreihe || !chartData.kategorienAusgaben || !chartData.cashflow) {
    return (
      <Card className="p-6 bg-white border-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Statistiken & Diagramme</h2>
        <p className="text-center text-gray-700 py-8">
          {!chartData ? 'Keine Chart-Daten verfügbar' : 'Noch keine Transaktionen vorhanden. Erstellen Sie eine erste Transaktion, um Charts anzuzeigen.'}
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-white border-2 border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Statistiken & Diagramme</h2>

      <Tabs defaultValue="zeitreihe" className="w-full">
        <div className="overflow-x-auto mb-6">
          <TabsList className="bg-gray-100 w-full md:w-auto inline-flex">
            <TabsTrigger value="zeitreihe" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 font-semibold text-sm md:text-base">
              Zeitreihe
            </TabsTrigger>
            <TabsTrigger value="kategorien" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 font-semibold text-sm md:text-base">
              Kategorien
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 font-semibold text-sm md:text-base">
              Cashflow
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Zeitreihe: Einnahmen vs. Ausgaben */}
        <TabsContent value="zeitreihe" className="mt-0">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Einnahmen vs. Ausgaben im Zeitverlauf</h3>
            <p className="text-sm text-gray-700">Vergleich von Einnahmen und Ausgaben pro Periode</p>
          </div>
          {chartData.zeitreihe && chartData.zeitreihe.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData.zeitreihe} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="periode" 
                tickFormatter={(value) => {
                  if (!value) return ''
                  
                  // Format: "2026-01-15" -> "15. Jan"
                  if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const [jahr, monat, tag] = value.split('-')
                    const monatNamen = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
                    const monatIndex = parseInt(monat) - 1
                    return `${tag}. ${monatNamen[monatIndex]}`
                  }
                  
                  // Format: "2026-01" -> "Jan 2026" (Fallback für Monate)
                  if (value.match(/^\d{4}-\d{2}$/)) {
                    const [jahr, monat] = value.split('-')
                    const monatNamen = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
                    const monatIndex = parseInt(monat) - 1
                    return `${monatNamen[monatIndex]} ${jahr}`
                  }
                  
                  return value
                }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={chartData.zeitreihe && chartData.zeitreihe.length > 30 ? Math.floor(chartData.zeitreihe.length / 15) : 0}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                formatter={(value: any) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
                labelFormatter={(label) => {
                  if (!label) return ''
                  
                  // Format: "2026-01-15" -> "15. Januar 2026"
                  if (label.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const [jahr, monat, tag] = label.split('-')
                    const monatNamen = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
                    const monatIndex = parseInt(monat) - 1
                    return `${tag}. ${monatNamen[monatIndex]} ${jahr}`
                  }
                  
                  // Format: "2026-01" -> "Januar 2026" (Fallback für Monate)
                  if (label.match(/^\d{4}-\d{2}$/)) {
                    const [jahr, monat] = label.split('-')
                    const monatNamen = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
                    const monatIndex = parseInt(monat) - 1
                    return `${monatNamen[monatIndex]} ${jahr}`
                  }
                  
                  return label
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="einnahmen" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Einnahmen"
                activeDot={{ r: 8 }}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="ausgaben" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="Ausgaben"
                activeDot={{ r: 8 }}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="#3B82F6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Differenz"
                activeDot={{ r: 8 }}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-700 font-medium">
              Keine Daten für den ausgewählten Zeitraum
            </div>
          )}
        </TabsContent>

        {/* Kategorien: Ausgaben-Verteilung */}
        <TabsContent value="kategorien" className="mt-0">
          {chartData.kategorienAusgaben && chartData.kategorienAusgaben.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ausgaben-Pie */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Ausgaben nach Kategorien</h3>
                <p className="text-sm text-gray-700">Top 8 Kategorien + Rest</p>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={chartData.kategorienAusgaben}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="wert"
                  >
                    {chartData.kategorienAusgaben.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Ausgaben-Bar */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Top Ausgabenkategorien</h3>
                <p className="text-sm text-gray-700">Sortiert nach Höhe</p>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData.kategorienAusgaben} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Bar dataKey="wert" fill="#EF4444">
                    {chartData.kategorienAusgaben.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          ) : (
            <div className="text-center py-8 text-gray-700 font-medium">
              Noch keine Ausgaben vorhanden
            </div>
          )}
        </TabsContent>

        {/* Cashflow: Kumulierter Saldo */}
        <TabsContent value="cashflow" className="mt-0">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Kumulierter Cashflow</h3>
            <p className="text-sm text-gray-700">Entwicklung des Gesamtsaldos über Zeit</p>
          </div>
          {chartData.cashflow && chartData.cashflow.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData.cashflow}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periode" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value: any) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="kumulierterSaldo" 
                stroke="#3B82F6" 
                strokeWidth={3}
                name="Kumulierter Saldo"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-700 font-medium">
              Keine Daten für den ausgewählten Zeitraum
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}

