"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Clock,
  Users,
  FileText,
  TrendingUp,
  DollarSign,
  Activity,
  UserPlus,
  Briefcase,
  AlertCircle,
  CheckCircle,
  MapPin,
  BarChart3,
  TrendingDown,
  Bot,
  Phone,
  FileCheck,
  Plane,
  Mail,
  Calendar,
  Settings,
  Zap,
  Target,
  Award,
  Globe,
  Smartphone,
  Building2,
  UserCheck,
  ClipboardCheck,
  Send,
  CalendarDays,
  Wrench
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Area,
  AreaChart
} from 'recharts'

// Default-Werte für Gerüstbau ERP KPIs
const defaultKPIs = {
  // Projekte
  aktiveProjekte: 0,
  projekteInPlanung: 0,
  abgeschlosseneProjekte: 0,
  
  // Mitarbeiter
  aktiveMitarbeiter: 0,
  urlaubsantraege: 0,
  offeneZeiteintraege: 0,
  
  // Finanzen
  offeneAngebote: 0,
  ueberfaelligeRechnungen: 0,
  monatsumsatz: 0,
  jahresumsatz: 0,
  
  // Auslastung
  mitarbeiterAuslastung: 0,
  projekteImBudget: 0,
  
  // Trends
  projekteWachstum: '+0%',
  umsatzWachstum: '+0%'
}

// Chart-Daten für Gerüstbau ERP
const projektStatusData = [
  { name: 'Aktiv', value: 12, color: '#10b981' },
  { name: 'In Planung', value: 8, color: '#f59e0b' },
  { name: 'Pausiert', value: 2, color: '#6b7280' },
  { name: 'Abgeschlossen', value: 35, color: '#3b82f6' },
  { name: 'Abgerechnet', value: 28, color: '#8b5cf6' }
]

const monthlyTrendsData = [
  { month: 'Jan', umsatz: 125000, projekte: 8, stunden: 1240 },
  { month: 'Feb', umsatz: 142000, projekte: 9, stunden: 1380 },
  { month: 'Mär', umsatz: 138000, projekte: 10, stunden: 1420 },
  { month: 'Apr', umsatz: 165000, projekte: 12, stunden: 1580 },
  { month: 'Mai', umsatz: 178000, projekte: 11, stunden: 1650 },
  { month: 'Jun', umsatz: 192000, projekte: 14, stunden: 1820 }
]

const mitarbeiterAuslastungData = [
  { name: 'Müller', stunden: 168, auslastung: 95, status: 'online' },
  { name: 'Schmidt', stunden: 160, auslastung: 90, status: 'online' },
  { name: 'Weber', stunden: 152, auslastung: 86, status: 'online' },
  { name: 'Wagner', stunden: 144, auslastung: 81, status: 'online' }
]

const recentActivities = [
  { id: 1, type: 'projekt', message: 'Neues Projekt "Hochhaus Stadtmitte" angelegt', user: 'Admin', time: 'vor 5 Minuten', icon: '🏗️', color: 'text-blue-600' },
  { id: 2, type: 'angebot', message: 'Angebot #2024-045 an Bauunternehmen Schmidt versendet', user: 'System', time: 'vor 12 Minuten', icon: '📝', color: 'text-green-600' },
  { id: 3, type: 'rechnung', message: 'Rechnung #2024-123 bezahlt (12.500 €)', user: 'Buchhaltung', time: 'vor 25 Minuten', icon: '💰', color: 'text-purple-600' },
  { id: 4, type: 'mitarbeiter', message: 'Zeiterfassung von 3 Mitarbeitern freigegeben', user: 'Admin', time: 'vor 1 Stunde', icon: '⏰', color: 'text-indigo-600' },
  { id: 5, type: 'urlaub', message: 'Urlaubsantrag von Müller genehmigt (15.-19. Juli)', user: 'Personalabteilung', time: 'vor 2 Stunden', icon: '🏖️', color: 'text-pink-600' },
  { id: 6, type: 'projekt', message: 'Projekt "Industriehalle Nord" abgeschlossen', user: 'Projektleiter', time: 'vor 3 Stunden', icon: '✅', color: 'text-emerald-600' }
]

const offeneAufgaben = [
  {
    id: 1,
    typ: 'Angebot',
    aufgabe: 'Angebot für Neubau Einkaufszentrum erstellen',
    status: 'offen',
    priority: 'hoch',
    faelligAm: 'Morgen'
  },
  {
    id: 2,
    typ: 'Rechnung',
    aufgabe: 'Mahnung für Rechnung #2024-098 versenden',
    status: 'offen',
    priority: 'hoch',
    faelligAm: 'Heute'
  },
  {
    id: 3,
    typ: 'Zeiterfassung',
    aufgabe: '5 offene Zeiteinträge freigeben',
    status: 'offen',
    priority: 'mittel',
    faelligAm: 'Diese Woche'
  },
  {
    id: 4,
    typ: 'Projekt',
    aufgabe: 'Material für Projekt "Stadtbrücke" bestellen',
    status: 'offen',
    priority: 'hoch',
    faelligAm: 'Heute'
  }
]

export default function AdminUebersichtPage() {
  const [kpis, setKpis] = useState(defaultKPIs)
  const [loadingDashboard, setLoadingDashboard] = useState(true)

  // Lade Dashboard-Daten aus der Datenbank
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoadingDashboard(true)
        const response = await fetch('/api/admin/dashboard', {
          cache: 'force-cache',
          next: { revalidate: 60 }
        })
        const result = await response.json()

        if (result.erfolg && result.data) {
          setKpis(result.data.kpis || defaultKPIs)
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        // Fallback auf default KPIs
        setKpis(defaultKPIs)
      } finally {
        setLoadingDashboard(false)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl">Gerüstbau ERP Dashboard</CardTitle>
              <CardDescription className="text-white/80">
                Zentrale Steuerung Ihrer Gerüstbau-Projekte, Mitarbeiter und Finanzen
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Link href="/dashboard/admin/einstellungen">
                  <Settings className="h-4 w-4 mr-2" />
                  Einstellungen
                </Link>
              </Button>
              <Button asChild className="bg-white text-blue-600 hover:bg-white/90">
                <Link href="/dashboard/admin/projekte">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Neue Projekte
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Haupt-KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/admin/projekte" className="block">
          <Card className="bg-white border-blue-200 hover:shadow-lg transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Aktive Projekte</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{kpis.aktiveProjekte || 0}</div>
              <p className="text-xs text-gray-600 mt-1">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                {kpis.projekteWachstum || '+0%'} Wachstum
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/mitarbeiter" className="block">
          <Card className="bg-white border-green-200 hover:shadow-lg transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Aktive Mitarbeiter</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{kpis.aktiveMitarbeiter || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Im Einsatz</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/angebote" className="block">
          <Card className="bg-white border-orange-200 hover:shadow-lg transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Offene Angebote</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{kpis.offeneAngebote || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Warten auf Antwort</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/rechnungen" className="block">
          <Card className="bg-white border-purple-200 hover:shadow-lg transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Monatsumsatz</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{(kpis.monatsumsatz || 0).toLocaleString('de-DE')} €</div>
              <p className="text-xs text-gray-600 mt-1">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                {kpis.umsatzWachstum || '+0%'} zum Vormonat
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Weitere KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/admin/projekte" className="block">
          <Card className="bg-white border-gray-200 hover:shadow-lg transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Abgeschlossene Projekte</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpis.abgeschlosseneProjekte || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Erfolgreich beendet</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/projekte" className="block">
          <Card className="bg-white border-gray-200 hover:shadow-lg transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">In Planung</CardTitle>
              <Clock className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpis.projekteInPlanung || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Projekte</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/zeiterfassung" className="block">
          <Card className="bg-white border-gray-200 hover:shadow-lg transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Zeiteinträge</CardTitle>
              <Clock className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpis.offeneZeiteintraege || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Warten auf Freigabe</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/rechnungen" className="block">
          <Card className="bg-white border-red-200 hover:shadow-lg transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Überfällig</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{kpis.ueberfaelligeRechnungen || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Rechnungen</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Projekt Status Distribution */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900">Projekt-Status-Verteilung</CardTitle>
            <CardDescription>Aktuelle Verteilung nach Projektstatus</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projektStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {projektStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900">Monatliche Entwicklung</CardTitle>
            <CardDescription>Umsatz, Projekte und Arbeitsstunden im Zeitverlauf</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrendsData}>
                <defs>
                  <linearGradient id="umsatzGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="projekteGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="umsatz"
                  stroke="#8b5cf6"
                  fill="url(#umsatzGradient)"
                  name="Umsatz (€)"
                />
                <Area
                  type="monotone"
                  dataKey="projekte"
                  stroke="#3b82f6"
                  fill="url(#projekteGradient)"
                  name="Projekte"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Mitarbeiter Auslastung */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Mitarbeiter-Auslastung</CardTitle>
          <CardDescription>Übersicht der Arbeitsstunden und Auslastung</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mitarbeiterAuslastungData.map((mitarbeiter, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{mitarbeiter.name}</p>
                    <p className="text-sm text-gray-600">
                      {mitarbeiter.stunden}h erfasst • {mitarbeiter.auslastung}% Auslastung
                    </p>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-600">
                  Aktiv
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section with Tabs */}
      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activities">Aktivitäten-Feed</TabsTrigger>
          <TabsTrigger value="tasks">Offene Aufgaben ({offeneAufgaben.length})</TabsTrigger>
          <TabsTrigger value="quick-actions">Schnellzugriffe</TabsTrigger>
        </TabsList>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-gray-900">Live-Aktivitäten-Feed</CardTitle>
              <CardDescription className="text-gray-600">Echtzeit-Updates aller Systemaktivitäten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">{activity.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${activity.color}`}>{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{activity.user}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offene Aufgaben Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-gray-900">Offene Aufgaben</CardTitle>
              <CardDescription className="text-gray-600">Ausstehende Aufgaben und Fälligkeiten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {offeneAufgaben.map((task) => (
                <div key={task.id} className="flex items-start justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{task.typ}</Badge>
                      <Badge variant={task.priority === 'hoch' ? 'destructive' : 'secondary'}>
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-2">{task.aufgabe}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>📅 Fällig: {task.faelligAm}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button variant="outline" size="sm">
                      Bearbeiten
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="quick-actions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button asChild variant="outline" className="h-auto py-6 flex-col items-center gap-3 hover:bg-blue-50 border-blue-200">
              <Link href="/dashboard/admin/mitarbeiter">
                <Users className="h-8 w-8 text-blue-600" />
                <span className="font-semibold">Mitarbeiter</span>
                <span className="text-sm text-gray-600">{kpis.aktiveMitarbeiter || 0} aktiv</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-6 flex-col items-center gap-3 hover:bg-green-50 border-green-200">
              <Link href="/dashboard/admin/projekte">
                <Briefcase className="h-8 w-8 text-green-600" />
                <span className="font-semibold">Projekte</span>
                <span className="text-sm text-gray-600">{kpis.aktiveProjekte || 0} aktiv</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-6 flex-col items-center gap-3 hover:bg-purple-50 border-purple-200">
              <Link href="/dashboard/admin/angebote">
                <FileText className="h-8 w-8 text-purple-600" />
                <span className="font-semibold">Angebote</span>
                <span className="text-sm text-gray-600">{kpis.offeneAngebote || 0} offen</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-6 flex-col items-center gap-3 hover:bg-orange-50 border-orange-200">
              <Link href="/dashboard/admin/rechnungen">
                <DollarSign className="h-8 w-8 text-orange-600" />
                <span className="font-semibold">Rechnungen</span>
                <span className="text-sm text-gray-600">{kpis.ueberfaelligeRechnungen || 0} überfällig</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-6 flex-col items-center gap-3 hover:bg-indigo-50 border-indigo-200">
              <Link href="/dashboard/admin/kalender">
                <Calendar className="h-8 w-8 text-indigo-600" />
                <span className="font-semibold">Kalender</span>
                <span className="text-sm text-gray-600">Einsatzplanung</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-6 flex-col items-center gap-3 hover:bg-pink-50 border-pink-200">
              <Link href="/dashboard/admin/statistiken">
                <BarChart3 className="h-8 w-8 text-pink-600" />
                <span className="font-semibold">Statistiken</span>
                <span className="text-sm text-gray-600">Reports & Analytics</span>
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
