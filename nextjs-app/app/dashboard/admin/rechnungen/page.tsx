"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, DollarSign, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { Rechnung } from '@/lib/db/types'
import RechnungTabelle from './components/RechnungTabelle'
import RechnungDialog from './components/RechnungDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function RechnungenPage() {
  const [rechnungen, setRechnungen] = useState<Rechnung[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRechnung, setSelectedRechnung] = useState<Rechnung | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'alle' | 'gesendet' | 'ueberfaellig'>('alle')

  useEffect(() => {
    loadRechnungen()
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
    
    const matchesFilter = filterStatus === 'alle' || r.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const stats = {
    gesamt: rechnungen.length,
    entwurf: rechnungen.filter(r => r.status === 'entwurf').length,
    gesendet: rechnungen.filter(r => r.status === 'gesendet').length,
    bezahlt: rechnungen.filter(r => r.status === 'bezahlt').length,
    ueberfaellig: rechnungen.filter(r => r.status === 'ueberfaellig').length,
    offenerBetrag: rechnungen
      .filter(r => r.status !== 'bezahlt' && r.status !== 'storniert')
      .reduce((sum, r) => sum + r.brutto, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
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

      {/* Statistiken */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesamt</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.gesamt}</div>
            <p className="text-xs text-gray-600 mt-1">Rechnungen</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesendet</CardTitle>
            <Send className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.gesendet}</div>
            <p className="text-xs text-gray-600 mt-1">Warten auf Zahlung</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Bezahlt</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.bezahlt}</div>
            <p className="text-xs text-gray-600 mt-1">Abgeschlossen</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Überfällig</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.ueberfaellig}</div>
            <p className="text-xs text-gray-600 mt-1">Mahnungen notwendig</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Offener Betrag</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.offenerBetrag.toLocaleString('de-DE', { minimumFractionDigits: 0 })} €</div>
            <p className="text-xs text-gray-600 mt-1">Noch offen</p>
          </CardContent>
        </Card>
      </div>

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


