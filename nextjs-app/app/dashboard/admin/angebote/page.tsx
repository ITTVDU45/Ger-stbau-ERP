"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, FileText, Send, CheckCircle, XCircle } from 'lucide-react'
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton'
import { Angebot } from '@/lib/db/types'
import AngebotTabelle from './components/AngebotTabelle'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AngebotePage() {
  const router = useRouter()
  const [angebote, setAngebote] = useState<Angebot[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'alle' | 'entwurf' | 'gesendet'>('alle')
  const [filterTyp, setFilterTyp] = useState<'alle' | 'dachdecker' | 'maler' | 'bauunternehmen'>('alle')

  useEffect(() => {
    loadAngebote()
  }, [])

  const loadAngebote = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/angebote')
      if (response.ok) {
        const data = await response.json()
        setAngebote(data.angebote || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Angebote:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoeschen = async (id: string) => {
    if (!confirm('Möchten Sie dieses Angebot wirklich löschen?')) return
    
    try {
      const response = await fetch(`/api/angebote/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadAngebote()
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
    }
  }

  const filteredAngebote = angebote.filter(a => {
    const matchesSearch = searchTerm === '' || 
      a.angebotsnummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.kundeName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'alle' || a.status === filterStatus
    const matchesTyp = filterTyp === 'alle' || a.angebotTyp === filterTyp
    
    return matchesSearch && matchesFilter && matchesTyp
  })

  const stats = {
    gesamt: angebote.length,
    entwurf: angebote.filter(a => a.status === 'entwurf').length,
    gesendet: angebote.filter(a => a.status === 'gesendet').length,
    angenommen: angebote.filter(a => a.status === 'angenommen').length,
    abgelehnt: angebote.filter(a => a.status === 'abgelehnt').length,
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl text-gray-900">Angebote</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-700">
                Erstellen und verwalten Sie Angebote
              </CardDescription>
            </div>
            <Button asChild className="hidden md:flex bg-green-600 hover:bg-green-700">
              <Link href="/dashboard/admin/angebote/neu">
                <Plus className="h-4 w-4 mr-2" />
                Neues Angebot
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      {/* Mobile FAB */}
      <FloatingActionButton 
        onClick={() => router.push('/dashboard/admin/angebote/neu')}
        label="Neues Angebot"
      />

      {/* Statistiken */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesamt</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.gesamt}</div>
            <p className="text-xs text-gray-600 mt-1">Angebote</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Entwurf</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.entwurf}</div>
            <p className="text-xs text-gray-600 mt-1">In Bearbeitung</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesendet</CardTitle>
            <Send className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.gesendet}</div>
            <p className="text-xs text-gray-600 mt-1">Warten auf Antwort</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Angenommen</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.angenommen}</div>
            <p className="text-xs text-gray-600 mt-1">Erfolgreich</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Abgelehnt</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.abgelehnt}</div>
            <p className="text-xs text-gray-600 mt-1">Nicht erfolgreich</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Suche */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Erste Reihe: Suche und Status */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Angebot oder Kunde suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="w-full sm:w-auto">
                <TabsList>
                  <TabsTrigger value="alle">Alle</TabsTrigger>
                  <TabsTrigger value="entwurf">Entwurf</TabsTrigger>
                  <TabsTrigger value="gesendet">Gesendet</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Zweite Reihe: Angebots-Typ Filter */}
            <div className="flex items-center gap-4">
              <Label className="text-gray-900 whitespace-nowrap">Angebots-Typ:</Label>
              <Select value={filterTyp} onValueChange={(v) => setFilterTyp(v as any)}>
                <SelectTrigger className="w-[200px] bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Typen</SelectItem>
                  <SelectItem value="dachdecker">Dachdecker</SelectItem>
                  <SelectItem value="maler">Maler</SelectItem>
                  <SelectItem value="bauunternehmen">Bauunternehmen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AngebotTabelle
            angebote={filteredAngebote}
            loading={loading}
            onLoeschen={handleLoeschen}
            onUpdate={loadAngebote}
          />
        </CardContent>
      </Card>
    </div>
  )
}

