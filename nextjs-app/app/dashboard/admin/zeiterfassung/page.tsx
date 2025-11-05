"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Search, 
  Clock,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react'
import { Zeiterfassung } from '@/lib/db/types'
import ZeiterfassungTabelle from './components/ZeiterfassungTabelle'
import ZeiterfassungDialog from './components/ZeiterfassungDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ZeiterfassungPage() {
  const [zeiteintraege, setZeiteintraege] = useState<Zeiterfassung[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEintrag, setSelectedEintrag] = useState<Zeiterfassung | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'alle' | 'offen' | 'freigegeben'>('alle')

  useEffect(() => {
    loadZeiteintraege()
  }, [])

  const loadZeiteintraege = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/zeiterfassung')
      if (response.ok) {
        const data = await response.json()
        setZeiteintraege(data.zeiteintraege || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Zeiteinträge:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNeuerEintrag = () => {
    setSelectedEintrag(undefined)
    setDialogOpen(true)
  }

  const handleBearbeiten = (eintrag: Zeiterfassung) => {
    setSelectedEintrag(eintrag)
    setDialogOpen(true)
  }

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false)
    setSelectedEintrag(undefined)
    if (updated) {
      loadZeiteintraege()
    }
  }

  const handleFreigeben = async (id: string) => {
    try {
      const response = await fetch(`/api/zeiterfassung/${id}/freigeben`, {
        method: 'POST'
      })
      
      if (response.ok) {
        loadZeiteintraege()
      }
    } catch (error) {
      console.error('Fehler beim Freigeben:', error)
    }
  }

  const handleAblehnen = async (id: string) => {
    try {
      const response = await fetch(`/api/zeiterfassung/${id}/ablehnen`, {
        method: 'POST'
      })
      
      if (response.ok) {
        loadZeiteintraege()
      }
    } catch (error) {
      console.error('Fehler beim Ablehnen:', error)
    }
  }

  const filteredEintraege = zeiteintraege.filter(z => {
    const matchesSearch = searchTerm === '' || 
      z.mitarbeiterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      z.projektName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'alle' || z.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const stats = {
    gesamt: zeiteintraege.length,
    offen: zeiteintraege.filter(z => z.status === 'offen').length,
    freigegeben: zeiteintraege.filter(z => z.status === 'freigegeben').length,
    abgelehnt: zeiteintraege.filter(z => z.status === 'abgelehnt').length,
    gesamtStunden: zeiteintraege.reduce((sum, z) => sum + z.stunden, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900">Zeiterfassung</CardTitle>
              <CardDescription className="text-gray-700">
                Verwalten Sie Arbeitszeiteinträge und geben Sie diese frei
              </CardDescription>
            </div>
            <Button onClick={handleNeuerEintrag} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Neuer Zeiteintrag
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Statistiken */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.gesamt}</div>
            <p className="text-xs text-gray-600 mt-1">Einträge</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offen</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.offen}</div>
            <p className="text-xs text-gray-600 mt-1">Warten auf Freigabe</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Freigegeben</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.freigegeben}</div>
            <p className="text-xs text-gray-600 mt-1">Genehmigt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abgelehnt</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.abgelehnt}</div>
            <p className="text-xs text-gray-600 mt-1">Nicht genehmigt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stunden</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.gesamtStunden.toFixed(1)}</div>
            <p className="text-xs text-gray-600 mt-1">Gesamt erfasst</p>
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
                placeholder="Mitarbeiter oder Projekt suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="alle">Alle</TabsTrigger>
                <TabsTrigger value="offen">Offen</TabsTrigger>
                <TabsTrigger value="freigegeben">Freigegeben</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ZeiterfassungTabelle
            zeiteintraege={filteredEintraege}
            loading={loading}
            onBearbeiten={handleBearbeiten}
            onFreigeben={handleFreigeben}
            onAblehnen={handleAblehnen}
          />
        </CardContent>
      </Card>

      {/* Dialog */}
      <ZeiterfassungDialog
        open={dialogOpen}
        eintrag={selectedEintrag}
        onClose={handleDialogClose}
      />
    </div>
  )
}

