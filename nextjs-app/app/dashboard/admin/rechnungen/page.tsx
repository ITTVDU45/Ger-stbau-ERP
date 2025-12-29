"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { Rechnung } from '@/lib/db/types'
import RechnungTabelle from './components/RechnungTabelle'
import RechnungDialog from './components/RechnungDialog'
import RechnungenKPICards from './components/RechnungenKPICards'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

export default function RechnungenPage() {
  const [rechnungen, setRechnungen] = useState<Rechnung[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRechnung, setSelectedRechnung] = useState<Rechnung | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'alle' | 'gesendet' | 'ueberfaellig'>('alle')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadRechnungen()
    loadStats()
  }, [])

  const loadRechnungen = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rechnungen')
      if (response.ok) {
        const data = await response.json()
        setRechnungen(data.rechnungen || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungen:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/rechnungen/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error)
      toast.error('Fehler beim Laden der Statistiken')
    }
  }

  const handleNeueRechnung = () => {
    setSelectedRechnung(undefined)
    setDialogOpen(true)
  }

  const handleBearbeiten = (rechnung: Rechnung) => {
    setSelectedRechnung(rechnung)
    setDialogOpen(true)
  }

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false)
    setSelectedRechnung(undefined)
    if (updated) {
      loadRechnungen()
    }
  }

  const handleLoeschen = async (id: string) => {
    if (!confirm('Möchten Sie diese Rechnung wirklich löschen?')) return
    
    try {
      const response = await fetch(`/api/rechnungen/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadRechnungen()
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
    }
  }

  const filteredRechnungen = rechnungen.filter(r => {
    const matchesSearch = searchTerm === '' || 
      r.rechnungsnummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.kundeName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesOldFilter = filterStatus === 'alle' || r.status === filterStatus
    
    // NEU: Filter nach KPI-Card-Click
    const matchesKPIFilter = !activeFilter || (
      (activeFilter === 'offen' && r.status === 'offen') ||
      (activeFilter === 'ueberfaellig' && r.istUeberfaellig) ||
      (activeFilter === 'bezahlt' && r.status === 'bezahlt') ||
      (activeFilter === 'mahnung' && r.hatOffeneMahnung) ||
      (activeFilter === 'ohne_mahnung' && r.istUeberfaellig && !r.hatOffeneMahnung)
    )
    
    return matchesSearch && matchesOldFilter && matchesKPIFilter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-linear-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900">Rechnungen</CardTitle>
              <CardDescription className="text-gray-700">
                Verwalten Sie Rechnungen und Zahlungen
              </CardDescription>
            </div>
            <Button onClick={handleNeueRechnung} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Neue Rechnung
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* NEU: KPI-Cards */}
      <RechnungenKPICards 
        stats={stats} 
        onCardClick={(filter) => {
          setActiveFilter(activeFilter === filter ? null : filter)
        }} 
      />

      {/* Filter & Suche */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechnung oder Kunde suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="alle">Alle</TabsTrigger>
                <TabsTrigger value="gesendet">Gesendet</TabsTrigger>
                <TabsTrigger value="ueberfaellig">Überfällig</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <RechnungTabelle
            rechnungen={filteredRechnungen}
            loading={loading}
            onBearbeiten={handleBearbeiten}
            onLoeschen={handleLoeschen}
          />
        </CardContent>
      </Card>

      {/* Dialog */}
      <RechnungDialog
        open={dialogOpen}
        rechnung={selectedRechnung}
        onClose={handleDialogClose}
      />
    </div>
  )
}


