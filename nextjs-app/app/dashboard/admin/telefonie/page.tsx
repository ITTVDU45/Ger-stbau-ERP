"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Bot,
  Play,
  Pause,
  Volume2,
  Calendar,
  User,
  TrendingUp,
  Activity
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// Dummy-Daten
const pendingCalls = [
  { id: 'P4E-1001', name: 'Maria Schmidt', zeit: '14:30', priorität: 'Hoch', versuch: 1 },
  { id: 'P4E-1004', name: 'Ahmed Hassan', zeit: '15:00', priorität: 'Mittel', versuch: 1 },
  { id: 'P4E-1007', name: 'Lin Wang', zeit: '15:30', priorität: 'Hoch', versuch: 2 }
]

const recentCalls = [
  {
    id: 'CALL-001',
    bewerberId: 'P4E-1002',
    bewerberName: 'Carlos Rodriguez',
    datum: '2025-10-17 11:45',
    dauer: '23 Min',
    status: 'Erfolgreich',
    themen: ['Berufserfahrung', 'Deutschkenntnisse', 'Verfügbarkeit'],
    qualität: 9.2,
    transcript: 'Zusammenfassung: Bewerber verfügt über 7 Jahre Erfahrung...'
  },
  {
    id: 'CALL-002',
    bewerberId: 'P4E-1003',
    bewerberName: 'Anna Kowalski',
    datum: '2025-10-17 10:15',
    dauer: '18 Min',
    status: 'Erfolgreich',
    themen: ['Qualifikationen', 'Relocation', 'Gehalt'],
    qualität: 8.7,
    transcript: 'Zusammenfassung: Bereit für sofortige Relocation...'
  },
  {
    id: 'CALL-003',
    bewerberId: 'P4E-1005',
    bewerberName: 'Sofia Petrova',
    datum: '2025-10-16 16:30',
    dauer: '15 Min',
    status: 'Nicht erreicht',
    themen: [],
    qualität: null,
    transcript: null
  }
]

const callStats = [
  { name: 'Heute', geplant: 15, durchgeführt: 8, erfolgreich: 6 },
  { name: 'Gestern', geplant: 12, durchgeführt: 11, erfolgreich: 9 },
  { name: 'Mo', geplant: 18, durchgeführt: 16, erfolgreich: 13 },
  { name: 'Di', geplant: 14, durchgeführt: 13, erfolgreich: 11 }
]

const callOutcomes = [
  { name: 'Erfolgreich', value: 78, color: '#10b981' },
  { name: 'Nicht erreicht', value: 15, color: '#f59e0b' },
  { name: 'Abgelehnt', value: 7, color: '#ef4444' }
]

export default function TelefoniePage() {
  const [agentStatus, setAgentStatus] = useState('online')

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="card-gradient-blue border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl flex items-center gap-2">
                <Phone className="h-6 w-6" />
                Telefonie-Agent Kontrolle
              </CardTitle>
              <CardDescription className="text-white/80">
                KI-gesteuerte automatisierte Telefonate mit Bewerbern
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Bot className="h-4 w-4 mr-2" />
                Agent Einstellungen
              </Button>
              <Button className="btn-gradient-green">
                <Play className="h-4 w-4 mr-2" />
                Agent starten
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Agent Status */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Bot className="h-5 w-5 text-green-600" />
            Agent-Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <p className="font-semibold text-gray-900">Online & Bereit</p>
                <p className="text-sm text-gray-600">Aktiv seit 08:00 Uhr • 8 Calls durchgeführt</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">6</p>
                <p className="text-xs text-gray-600">Erfolgreiche Calls heute</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">89%</p>
                <p className="text-xs text-gray-600">Erfolgsrate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Warteschlange</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingCalls.length}</div>
            <p className="text-xs text-gray-600">Ausstehende Anrufe</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Heute durchgeführt</CardTitle>
            <Phone className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">8</div>
            <p className="text-xs text-gray-600">Von 15 geplanten</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Ø Dauer</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">19 Min</div>
            <p className="text-xs text-gray-600">Durchschnittliche Gesprächszeit</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Erfolgsrate</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">89%</div>
            <p className="text-xs text-gray-600">Letzte 7 Tage</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900">Call-Statistiken</CardTitle>
            <CardDescription>Geplant vs. Durchgeführt vs. Erfolgreich</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={callStats}>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Legend />
                <Bar dataKey="geplant" fill="#3b82f6" name="Geplant" />
                <Bar dataKey="durchgeführt" fill="#8b5cf6" name="Durchgeführt" />
                <Bar dataKey="erfolgreich" fill="#10b981" name="Erfolgreich" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900">Call-Ergebnisse</CardTitle>
            <CardDescription>Verteilung der Anruf-Outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={callOutcomes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                >
                  {callOutcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Warteschlange */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Anruf-Warteschlange</CardTitle>
          <CardDescription>Nächste geplante Telefonate</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="admin-table">
            <TableHeader>
              <TableRow>
                <TableHead>Bewerber-ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Geplante Zeit</TableHead>
                <TableHead>Priorität</TableHead>
                <TableHead>Versuch</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingCalls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="font-mono">{call.id}</TableCell>
                  <TableCell className="font-semibold">{call.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-gray-500" />
                      {call.zeit}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={call.priorität === 'Hoch' ? 'destructive' : 'secondary'}>
                      {call.priorität}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {call.versuch > 1 ? (
                      <Badge variant="outline">Versuch {call.versuch}</Badge>
                    ) : (
                      <span className="text-sm text-gray-600">Erstversuch</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" className="btn-gradient-green">
                      <Play className="h-3 w-3 mr-1" />
                      Jetzt anrufen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Letzte Anrufe */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Letzte Anrufe</CardTitle>
          <CardDescription>Kürzlich durchgeführte Telefonate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCalls.map((call) => (
              <div key={call.id} className="flex items-start justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{call.bewerberName}</h4>
                    <Badge variant={
                      call.status === 'Erfolgreich' ? 'default' :
                      call.status === 'Nicht erreicht' ? 'secondary' : 'destructive'
                    }>
                      {call.status}
                    </Badge>
                    {call.qualität && (
                      <span className="text-sm font-semibold text-green-600">
                        Qualität: {call.qualität}/10
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    ID: {call.bewerberId} • {call.datum} • Dauer: {call.dauer}
                  </p>
                  {call.themen.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      {call.themen.map((thema, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {thema}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {call.transcript && (
                    <p className="text-sm text-gray-700 italic">{call.transcript}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline">
                    <Volume2 className="h-3 w-3 mr-1" />
                    Aufnahme
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/admin/telefonie/${call.id}`}>
                      Details
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

