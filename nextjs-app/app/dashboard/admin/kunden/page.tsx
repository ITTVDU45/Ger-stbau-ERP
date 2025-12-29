"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Users, TrendingUp, DollarSign, AlertCircle } from 'lucide-react'
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton'
import { Kunde } from '@/lib/db/types'
import KundeTabelle from './components/KundeTabelle'
import KundeDialog from './components/KundeDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function KundenPage() {
  const [kunden, setKunden] = useState<Kunde[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedKunde, setSelectedKunde] = useState<Kunde | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'alle' | 'aktiv' | 'inaktiv'>('aktiv')
  const [filterTyp, setFilterTyp] = useState<'alle' | 'privat' | 'gewerblich' | 'oeffentlich'>('alle')

  useEffect(() => {
    loadKunden()
  }, [])

  const loadKunden = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/kunden')
      if (response.ok) {
        const data = await response.json()
        setKunden(data.kunden || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNeuerKunde = () => {
    setSelectedKunde(undefined)
    setDialogOpen(true)
  }

  const handleBearbeiten = (kunde: Kunde) => {
    setSelectedKunde(kunde)
    setDialogOpen(true)
  }

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false)
    setSelectedKunde(undefined)
    if (updated) {
      loadKunden()
    }
  }

  const handleLoeschen = async (id: string) => {
    if (!confirm('Möchten Sie diesen Kunden wirklich löschen?')) return
    
    try {
      const response = await fetch(`/api/kunden/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadKunden()
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
    }
  }

  const handleDeaktivieren = async (id: string) => {
    try {
      const response = await fetch(`/api/kunden/${id}/deaktivieren`, {
        method: 'POST'
      })
      
      if (response.ok) {
        loadKunden()
      }
    } catch (error) {
      console.error('Fehler beim Deaktivieren:', error)
    }
  }

  const filteredKunden = kunden.filter(k => {
    const matchesSearch = searchTerm === '' || 
      (k.firma?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (k.vorname?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (k.nachname?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (k.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (k.kundennummer?.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = filterStatus === 'alle' || 
      (filterStatus === 'aktiv' && k.aktiv) ||
      (filterStatus === 'inaktiv' && !k.aktiv)
    
    const matchesTyp = filterTyp === 'alle' || k.kundentyp === filterTyp
    
    return matchesSearch && matchesStatus && matchesTyp
  })

  const stats = {
    gesamt: kunden.length,
    aktiv: kunden.filter(k => k.aktiv).length,
    umsatzGesamt: kunden.reduce((sum, k) => sum + (k.umsatzGesamt || 0), 0),
    offenePosten: kunden.reduce((sum, k) => sum + (k.offenePosten || 0), 0),
    privat: kunden.filter(k => k.kundentyp === 'privat').length,
    gewerblich: kunden.filter(k => k.kundentyp === 'gewerblich').length,
    oeffentlich: kunden.filter(k => k.kundentyp === 'oeffentlich').length,
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl text-gray-900">Kunden-Verwaltung</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-700">
                Verwalten Sie alle Kunden und deren Geschäftsbeziehungen
              </CardDescription>
            </div>
            <Button onClick={handleNeuerKunde} className="hidden md:flex bg-cyan-600 hover:bg-cyan-700">
              <Plus className="h-4 w-4 mr-2" />
              Neuer Kunde
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      {/* Mobile FAB */}
      <FloatingActionButton 
        onClick={handleNeuerKunde}
        label="Neuer Kunde"
      />

      {/* Statistiken */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesamt</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.gesamt}</div>
            <p className="text-xs text-gray-600 mt-1">Kunden</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Aktiv</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.aktiv}</div>
            <p className="text-xs text-gray-600 mt-1">Aktive Kunden</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesamtumsatz</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.umsatzGesamt.toLocaleString('de-DE', { minimumFractionDigits: 0 })} €</div>
            <p className="text-xs text-gray-600 mt-1">Alle Kunden</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Offene Posten</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.offenePosten.toLocaleString('de-DE', { minimumFractionDigits: 0 })} €</div>
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
                placeholder="Kunden suchen (Name, Firma, E-Mail, Kundennummer)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="w-auto">
                <TabsList>
                  <TabsTrigger value="alle">Alle</TabsTrigger>
                  <TabsTrigger value="aktiv">Aktiv</TabsTrigger>
                  <TabsTrigger value="inaktiv">Inaktiv</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={filterTyp} onValueChange={(v) => setFilterTyp(v as any)} className="w-auto">
                <TabsList>
                  <TabsTrigger value="alle">Alle Typen</TabsTrigger>
                  <TabsTrigger value="privat">Privat</TabsTrigger>
                  <TabsTrigger value="gewerblich">Gewerblich</TabsTrigger>
                  <TabsTrigger value="oeffentlich">Öffentlich</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <KundeTabelle
            kunden={filteredKunden}
            loading={loading}
            onBearbeiten={handleBearbeiten}
            onLoeschen={handleLoeschen}
            onDeaktivieren={handleDeaktivieren}
          />
        </CardContent>
      </Card>

      {/* Dialog */}
      <KundeDialog
        open={dialogOpen}
        kunde={selectedKunde}
        onClose={handleDialogClose}
      />
    </div>
  )
}

