"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Calendar, Users, Briefcase } from 'lucide-react'
import { Einsatz } from '@/lib/db/types'
import EinsatzTabelle from './components/EinsatzTabelle'
import EinsatzDialog from './components/EinsatzDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function EinsatzplanungPage() {
  const [einsaetze, setEinsaetze] = useState<Einsatz[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEinsatz, setSelectedEinsatz] = useState<Einsatz | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadEinsaetze()
  }, [])

  const loadEinsaetze = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/einsatzplanung')
      if (response.ok) {
        const data = await response.json()
        setEinsaetze(data.einsaetze || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einsätze:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNeuerEinsatz = () => {
    setSelectedEinsatz(undefined)
    setDialogOpen(true)
  }

  const handleBearbeiten = (einsatz: Einsatz) => {
    setSelectedEinsatz(einsatz)
    setDialogOpen(true)
  }

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false)
    setSelectedEinsatz(undefined)
    if (updated) {
      loadEinsaetze()
    }
  }

  const handleLoeschen = async (id: string) => {
    if (!confirm('Möchten Sie diesen Einsatz wirklich löschen?')) return
    
    try {
      const response = await fetch(`/api/einsatzplanung/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadEinsaetze()
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
    }
  }

  const filteredEinsaetze = einsaetze.filter(e => {
    return searchTerm === '' || 
      e.mitarbeiterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.projektName.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const stats = {
    gesamt: einsaetze.length,
    bestaetigt: einsaetze.filter(e => e.bestaetigt).length,
    geplant: einsaetze.filter(e => !e.bestaetigt).length,
    aktiveMitarbeiter: new Set(einsaetze.map(e => e.mitarbeiterId)).size,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900">Einsatzplanung</CardTitle>
              <CardDescription className="text-gray-700">
                Planen Sie Mitarbeiter-Einsätze auf Projekten
              </CardDescription>
            </div>
            <Button onClick={handleNeuerEinsatz} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />
              Neuer Einsatz
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Statistiken */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesamt</CardTitle>
            <Calendar className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.gesamt}</div>
            <p className="text-xs text-gray-600 mt-1">Einsätze geplant</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Bestätigt</CardTitle>
            <Briefcase className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.bestaetigt}</div>
            <p className="text-xs text-gray-600 mt-1">Bestätigte Einsätze</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Geplant</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.geplant}</div>
            <p className="text-xs text-gray-600 mt-1">Noch zu bestätigen</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Mitarbeiter</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.aktiveMitarbeiter}</div>
            <p className="text-xs text-gray-600 mt-1">Im Einsatz</p>
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
                placeholder="Mitarbeiter oder Projekt suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EinsatzTabelle
            einsaetze={filteredEinsaetze}
            loading={loading}
            onBearbeiten={handleBearbeiten}
            onLoeschen={handleLoeschen}
          />
        </CardContent>
      </Card>

      {/* Dialog */}
      <EinsatzDialog
        open={dialogOpen}
        einsatz={selectedEinsatz}
        onClose={handleDialogClose}
      />
    </div>
  )
}

