'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Projekt, Vorkalkulation, Nachkalkulation } from '@/lib/db/types'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { TrendingUp, PieChartIcon, BarChart3, Activity } from 'lucide-react'

interface KalkulationsVerlaufChartsProps {
  projekt: Projekt
  vorkalkulation?: Vorkalkulation
  nachkalkulation?: Nachkalkulation
}

export default function KalkulationsVerlaufCharts({ 
  projekt, 
  vorkalkulation, 
  nachkalkulation 
}: KalkulationsVerlaufChartsProps) {
  if (!vorkalkulation || !nachkalkulation) {
    return (
      <Card className="border-gray-200 bg-white">
        <CardContent className="pt-6 bg-white">
          <div className="text-center text-gray-600 py-8">
            <PieChartIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">Keine Daten für Visualisierungen verfügbar</p>
            <p className="text-sm mt-2">Erstellen Sie eine Vorkalkulation und erfassen Sie Zeiten.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Daten für Balkendiagramm: Soll vs Ist
  const balkenData = [
    {
      kategorie: 'Aufbau',
      Soll: vorkalkulation.sollStundenAufbau,
      Ist: nachkalkulation.istStundenAufbau
    },
    {
      kategorie: 'Abbau',
      Soll: vorkalkulation.sollStundenAbbau,
      Ist: nachkalkulation.istStundenAbbau
    },
    {
      kategorie: 'Gesamt',
      Soll: vorkalkulation.gesamtSollStunden,
      Ist: nachkalkulation.gesamtIstStunden
    }
  ]

  // Daten für Tortendiagramm: Aufbau/Abbau-Verteilung
  const tortenData = [
    { name: 'Aufbau', value: nachkalkulation.istStundenAufbau },
    { name: 'Abbau', value: nachkalkulation.istStundenAbbau }
  ]

  const COLORS = ['#3b82f6', '#10b981']

  // Daten für Liniendiagramm: Zeitlicher Verlauf
  const verlaufData = projekt.kalkulationsVerlauf?.slice(-10).map((eintrag, index) => ({
    datum: new Date(eintrag.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    istUmsatz: eintrag.istUmsatzGesamt,
    erfuellungsgrad: eintrag.erfuellungsgrad
  })) || []

  // Daten für Mitarbeiter-Fortschritt
  const mitarbeiterProgress = nachkalkulation.mitarbeiterAuswertung.slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Balkendiagramm Soll vs Ist */}
      <Card className="border-gray-200 bg-white">
        <CardHeader className="bg-white">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg font-bold text-gray-900">Soll-Ist-Vergleich</CardTitle>
          </div>
          <CardDescription className="text-gray-600">
            Vergleich der geplanten mit den tatsächlichen Stunden
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={balkenData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="kategorie" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="Soll" fill="#3b82f6" name="Soll-Stunden" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Ist" fill="#10b981" name="Ist-Stunden" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 2: Tortendiagramm Aufbau/Abbau */}
      <Card className="border-gray-200 bg-white">
        <CardHeader className="bg-white">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg font-bold text-gray-900">Verteilung Aufbau/Abbau</CardTitle>
          </div>
          <CardDescription className="text-gray-600">
            Prozentuale Aufteilung der Ist-Stunden
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tortenData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {tortenData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded border-2 border-blue-300">
              <p className="text-sm font-bold text-blue-900">Aufbau</p>
              <p className="text-3xl font-bold text-blue-900">{nachkalkulation.istStundenAufbau} h</p>
            </div>
            <div className="bg-green-50 p-3 rounded border-2 border-green-300">
              <p className="text-sm font-bold text-green-900">Abbau</p>
              <p className="text-3xl font-bold text-green-900">{nachkalkulation.istStundenAbbau} h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart 3: Liniendiagramm Verlauf */}
      {verlaufData.length > 0 && (
        <Card className="border-gray-200 bg-white">
          <CardHeader className="bg-white">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg font-bold text-gray-900">Verlauf Ist-Umsatz</CardTitle>
            </div>
            <CardDescription className="text-gray-600">
              Zeitliche Entwicklung der Nachkalkulation (letzte 10 Einträge)
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={verlaufData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="datum" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="istUmsatz" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  name="Ist-Umsatz (€)" 
                  dot={{ fill: '#8b5cf6', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Chart 4: Fortschrittsbalken pro Mitarbeiter */}
      <Card className="border-gray-200 bg-white">
        <CardHeader className="bg-white">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg font-bold text-gray-900">Mitarbeiter-Erfüllung</CardTitle>
          </div>
          <CardDescription className="text-gray-600">
            Top 5 Mitarbeiter nach Erfüllungsgrad
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white">
          {mitarbeiterProgress.length > 0 ? (
            <div className="space-y-4">
              {mitarbeiterProgress.map((ma) => {
                const erfuellungsprozent = ma.zeitSoll > 0 
                  ? (ma.zeitIst / ma.zeitSoll) * 100 
                  : 100
                const getColor = () => {
                  if (erfuellungsprozent >= 95 && erfuellungsprozent <= 105) return 'bg-green-500'
                  if (erfuellungsprozent >= 90 && erfuellungsprozent <= 110) return 'bg-yellow-500'
                  return 'bg-red-500'
                }

                return (
                  <div key={ma.mitarbeiterId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">{ma.mitarbeiterName}</span>
                      <span className="text-base font-bold text-gray-900">
                        {erfuellungsprozent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={Math.min(erfuellungsprozent, 200)} 
                        className="h-3"
                      />
                      <div 
                        className={`absolute top-0 left-0 h-3 rounded-full ${getColor()}`}
                        style={{ width: `${Math.min(erfuellungsprozent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-700 font-medium">
                      <span>Ist: {ma.zeitIst.toFixed(1)}h</span>
                      <span>Soll: {ma.zeitSoll.toFixed(1)}h</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-gray-600 py-8">
              <p className="text-sm">Keine Mitarbeiter-Daten verfügbar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

