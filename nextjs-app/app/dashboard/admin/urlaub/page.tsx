"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Urlaub } from '@/lib/db/types'
import UrlaubTabelle from './components/UrlaubTabelle'
import UrlaubDialog from './components/UrlaubDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function UrlaubPage() {
  const [urlaube, setUrlaube] = useState<Urlaub[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUrlaub, setSelectedUrlaub] = useState<Urlaub | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'alle' | 'beantragt' | 'genehmigt'>('alle')

  useEffect(() => {
    loadUrlaube()
  }, [])

  const loadUrlaube = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/urlaub')
      if (response.ok) {
        const data = await response.json()
        setUrlaube(data.urlaube || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Urlaubsanträge:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNeuerAntrag = () => {
    setSelectedUrlaub(undefined)
    setDialogOpen(true)
  }

  const handleBearbeiten = (urlaub: Urlaub) => {
    setSelectedUrlaub(urlaub)
    setDialogOpen(true)
  }

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false)
    setSelectedUrlaub(undefined)
    if (updated) {
      loadUrlaube()
    }
  }

  const handleGenehmigen = async (id: string) => {
    try {
      const response = await fetch(`/api/urlaub/${id}/genehmigen`, {
        method: 'POST'
      })
      
      if (response.ok) {
        loadUrlaube()
      }
    } catch (error) {
      console.error('Fehler beim Genehmigen:', error)
    }
  }

  const handleAblehnen = async (id: string) => {
    const grund = prompt('Grund für die Ablehnung:')
    if (!grund) return

    try {
      const response = await fetch(`/api/urlaub/${id}/ablehnen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ablehnungsgrund: grund })
      })
      
      if (response.ok) {
        loadUrlaube()
      }
    } catch (error) {
      console.error('Fehler beim Ablehnen:', error)
    }
  }

  const handleLoeschen = async (id: string) => {
    if (!confirm('Möchten Sie diesen Urlaubsantrag wirklich löschen?')) return
    
    try {
      const response = await fetch(`/api/urlaub/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadUrlaube()
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
    }
  }

  const filteredUrlaube = urlaube.filter(u => {
    const matchesSearch = searchTerm === '' || 
      u.mitarbeiterName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'alle' || u.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const stats = {
    gesamt: urlaube.length,
    beantragt: urlaube.filter(u => u.status === 'beantragt').length,
    genehmigt: urlaube.filter(u => u.status === 'genehmigt').length,
    abgelehnt: urlaube.filter(u => u.status === 'abgelehnt').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900">Urlaub & Abwesenheiten</CardTitle>
              <CardDescription className="text-gray-700">
                Verwalten Sie Urlaubsanträge und Abwesenheiten
              </CardDescription>
            </div>
            <Button onClick={handleNeuerAntrag} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Neuer Antrag
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
            <p className="text-xs text-gray-600 mt-1">Anträge</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Beantragt</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.beantragt}</div>
            <p className="text-xs text-gray-600 mt-1">Warten auf Genehmigung</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Genehmigt</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.genehmigt}</div>
            <p className="text-xs text-gray-600 mt-1">Genehmigt</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Abgelehnt</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.abgelehnt}</div>
            <p className="text-xs text-gray-600 mt-1">Abgelehnt</p>
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
                placeholder="Mitarbeiter suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="alle">Alle</TabsTrigger>
                <TabsTrigger value="beantragt">Beantragt</TabsTrigger>
                <TabsTrigger value="genehmigt">Genehmigt</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <UrlaubTabelle
            urlaube={filteredUrlaube}
            loading={loading}
            onBearbeiten={handleBearbeiten}
            onGenehmigen={handleGenehmigen}
            onAblehnen={handleAblehnen}
            onLoeschen={handleLoeschen}
          />
        </CardContent>
      </Card>

      {/* Dialog */}
      <UrlaubDialog
        open={dialogOpen}
        urlaub={selectedUrlaub}
        onClose={handleDialogClose}
      />
    </div>
  )
}


