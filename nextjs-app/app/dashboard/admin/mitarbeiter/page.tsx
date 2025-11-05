"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  UserPlus, 
  Search, 
  Filter,
  Users,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { Mitarbeiter } from '@/lib/db/types'
import MitarbeiterTabelle from './components/MitarbeiterTabelle'
import MitarbeiterDialog from './components/MitarbeiterDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function MitarbeiterPage() {
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<Mitarbeiter | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'alle' | 'aktiv' | 'inaktiv'>('aktiv')

  useEffect(() => {
    loadMitarbeiter()
  }, [])

  const loadMitarbeiter = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/mitarbeiter')
      if (response.ok) {
        const data = await response.json()
        setMitarbeiter(data.mitarbeiter || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNeuerMitarbeiter = () => {
    setSelectedMitarbeiter(undefined)
    setDialogOpen(true)
  }

  const handleBearbeiten = (mitarbeiter: Mitarbeiter) => {
    setSelectedMitarbeiter(mitarbeiter)
    setDialogOpen(true)
  }

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false)
    setSelectedMitarbeiter(undefined)
    if (updated) {
      loadMitarbeiter()
    }
  }

  const handleLoeschen = async (id: string) => {
    if (!confirm('Möchten Sie diesen Mitarbeiter wirklich löschen?')) return
    
    try {
      const response = await fetch(`/api/mitarbeiter/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadMitarbeiter()
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
    }
  }

  const filteredMitarbeiter = mitarbeiter.filter(m => {
    const matchesSearch = searchTerm === '' || 
      m.vorname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nachname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'alle' || 
      (filterStatus === 'aktiv' && m.aktiv) ||
      (filterStatus === 'inaktiv' && !m.aktiv)
    
    return matchesSearch && matchesFilter
  })

  const stats = {
    gesamt: mitarbeiter.length,
    aktiv: mitarbeiter.filter(m => m.aktiv).length,
    festangestellt: mitarbeiter.filter(m => m.beschaeftigungsart === 'festangestellt').length,
    aushilfe: mitarbeiter.filter(m => m.beschaeftigungsart === 'aushilfe').length,
    subunternehmer: mitarbeiter.filter(m => m.beschaeftigungsart === 'subunternehmer').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900">Mitarbeiter-Verwaltung</CardTitle>
              <CardDescription className="text-gray-700">
                Verwalten Sie alle Mitarbeiter, Qualifikationen und Einsätze
              </CardDescription>
            </div>
            <Button onClick={handleNeuerMitarbeiter} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Neuer Mitarbeiter
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Statistiken */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.gesamt}</div>
            <p className="text-xs text-gray-600 mt-1">Alle Mitarbeiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiv</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.aktiv}</div>
            <p className="text-xs text-gray-600 mt-1">Aktive Mitarbeiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Festangestellt</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.festangestellt}</div>
            <p className="text-xs text-gray-600 mt-1">Festangestellte</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aushilfen</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.aushilfe}</div>
            <p className="text-xs text-gray-600 mt-1">Aushilfen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subunternehmer</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.subunternehmer}</div>
            <p className="text-xs text-gray-600 mt-1">Subunternehmer</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Suche */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Mitarbeiter suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="alle">Alle</TabsTrigger>
                <TabsTrigger value="aktiv">Aktiv</TabsTrigger>
                <TabsTrigger value="inaktiv">Inaktiv</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <MitarbeiterTabelle
            mitarbeiter={filteredMitarbeiter}
            loading={loading}
            onBearbeiten={handleBearbeiten}
            onLoeschen={handleLoeschen}
          />
        </CardContent>
      </Card>

      {/* Dialog */}
      <MitarbeiterDialog
        open={dialogOpen}
        mitarbeiter={selectedMitarbeiter}
        onClose={handleDialogClose}
      />
    </div>
  )
}

