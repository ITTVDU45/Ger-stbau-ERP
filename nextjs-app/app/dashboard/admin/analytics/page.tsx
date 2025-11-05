"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Download,
  Calendar,
  Award,
  Globe
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

// Dummy-Daten für Analytics
const monthlyPerformance = [
  { monat: 'Apr', bewerber: 145, platziert: 38, leads: 420, kosten: 5200 },
  { monat: 'Mai', bewerber: 178, platziert: 45, leads: 512, kosten: 6100 },
  { monat: 'Jun', bewerber: 192, platziert: 52, leads: 580, kosten: 6800 },
  { monat: 'Jul', bewerber: 168, platziert: 48, leads: 490, kosten: 5900 },
  { monat: 'Aug', bewerber: 205, platziert: 61, leads: 640, kosten: 7400 },
  { monat: 'Sep', bewerber: 234, platziert: 72, leads: 710, kosten: 8200 }
]

const conversionFunnel = [
  { stufe: 'Leads', anzahl: 2352, farbe: '#3b82f6' },
  { stufe: 'Kontaktiert', anzahl: 1876, farbe: '#8b5cf6' },
  { stufe: 'Qualifiziert', anzahl: 1234, farbe: '#10b981' },
  { stufe: 'Telefonie', anzahl: 892, farbe: '#f59e0b' },
  { stufe: 'CV erstellt', anzahl: 678, farbe: '#ec4899' },
  { stufe: 'Matching', anzahl: 456, farbe: '#06b6d4' },
  { stufe: 'Platziert', anzahl: 316, farbe: '#14b8a6' }
]

const berufeVerteilung = [
  { beruf: 'Pflegekräfte', anzahl: 156, farbe: '#10b981' },
  { beruf: 'IT-Spezialisten', anzahl: 89, farbe: '#3b82f6' },
  { beruf: 'Handwerker', anzahl: 67, farbe: '#f59e0b' },
  { beruf: 'Ingenieure', anzahl: 34, farbe: '#8b5cf6' },
  { beruf: 'Sonstige', anzahl: 30, farbe: '#6b7280' }
]

const länderVerteilung = [
  { land: 'Philippinen', bewerber: 145 },
  { land: 'Indien', bewerber: 98 },
  { land: 'Spanien', bewerber: 76 },
  { land: 'Polen', bewerber: 54 },
  { land: 'Rumänien', bewerber: 43 },
  { land: 'Sonstige', bewerber: 68 }
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="card-gradient-blue border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Analytics & Reporting
              </CardTitle>
              <CardDescription className="text-white/80">
                Detaillierte Analyse und Berichte über alle Recruiting-Prozesse
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Calendar className="h-4 w-4 mr-2" />
                Zeitraum
              </Button>
              <Button className="btn-gradient-green">
                <Download className="h-4 w-4 mr-2" />
                Export Bericht
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Gesamt-KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesamt-Bewerber</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">1,122</div>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">+18.2%</span> vs. Vormonat
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Platziert</CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">316</div>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">+22.5%</span> vs. Vormonat
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Konversionsrate</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">28.2%</div>
            <p className="text-xs text-gray-600">Lead → Platzierung</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Leads (Monat)</CardTitle>
            <Globe className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">710</div>
            <p className="text-xs text-gray-600">Meta Ads Kampagnen</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Marketing-Kosten</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">€8.2k</div>
            <p className="text-xs text-gray-600">Ø €11.50 pro Lead</p>
          </CardContent>
        </Card>
      </div>

      {/* Monatliche Performance */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Monatliche Performance-Entwicklung</CardTitle>
          <CardDescription>Bewerber, Platzierungen, Leads und Kosten im Zeitverlauf</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyPerformance}>
              <defs>
                <linearGradient id="bewerberGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monat" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="bewerber" stroke="#3b82f6" strokeWidth={3} name="Bewerber" />
              <Line yAxisId="left" type="monotone" dataKey="platziert" stroke="#10b981" strokeWidth={3} name="Platziert" />
              <Line yAxisId="right" type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Leads" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Funnel & Berufe-Verteilung */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900">Conversion-Funnel</CardTitle>
            <CardDescription>Von Lead bis Platzierung</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={conversionFunnel} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="stufe" type="category" width={100} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Bar dataKey="anzahl" radius={[0, 8, 8, 0]}>
                  {conversionFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.farbe} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900">Bewerber nach Berufsgruppen</CardTitle>
            <CardDescription>Verteilung der Qualifikationen</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={berufeVerteilung}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  dataKey="anzahl"
                  label={(entry) => `${entry.beruf}: ${entry.anzahl}`}
                >
                  {berufeVerteilung.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.farbe} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Länder-Verteilung */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Bewerber nach Herkunftsland</CardTitle>
          <CardDescription>Top-Länder für Recruiting</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={länderVerteilung}>
              <XAxis dataKey="land" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Bar dataKey="bewerber" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* KI-Agenten Performance */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">KI-Agenten Performance-Metriken</CardTitle>
          <CardDescription>Effizienz und Qualität der automatisierten Prozesse</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">Bewerberscoring</h4>
                <span className="text-2xl font-bold text-blue-600">94%</span>
              </div>
              <p className="text-sm text-gray-600">Genauigkeit</p>
              <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: '94%' }}></div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">Telefonie-Agent</h4>
                <span className="text-2xl font-bold text-green-600">89%</span>
              </div>
              <p className="text-sm text-gray-600">Erfolgsrate</p>
              <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-600" style={{ width: '89%' }}></div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">CV-Generierung</h4>
                <span className="text-2xl font-bold text-purple-600">92%</span>
              </div>
              <p className="text-sm text-gray-600">Qualitätsscore</p>
              <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600" style={{ width: '92%' }}></div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">Visa-Agent</h4>
                <span className="text-2xl font-bold text-pink-600">87%</span>
              </div>
              <p className="text-sm text-gray-600">Genehmigungsrate</p>
              <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-pink-600" style={{ width: '87%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

