'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, FileQuestion, Clock, CheckCircle2 } from 'lucide-react'
import { Anfrage } from '@/lib/db/types'
import AnfrageTabelle from './components/AnfrageTabelle'
import { toast } from 'sonner'

export default function AnfragenPage() {
  const router = useRouter()
  const [anfragen, setAnfragen] = useState<Anfrage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'alle' | 'offen' | 'in_bearbeitung' | 'angebot_in_bearbeitung' | 'angebot_erstellt'>('alle')

  // Anfragen laden
  const loadAnfragen = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'alle') {
        params.append('status', filterStatus)
      }
      
      const response = await fetch(`/api/anfragen?${params.toString()}`)
      const data = await response.json()
      
      if (data.erfolg) {
        setAnfragen(data.anfragen)
      } else {
        toast.error('Fehler beim Laden', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler beim Laden der Anfragen:', error)
      toast.error('Fehler', {
        description: 'Anfragen konnten nicht geladen werden'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnfragen()
  }, [filterStatus])

  // Anfrage löschen
  const handleLoeschen = async (id: string) => {
    if (!confirm('Möchten Sie diese Anfrage wirklich löschen?')) return

    try {
      const response = await fetch(`/api/anfragen/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Erfolgreich gelöscht')
        loadAnfragen()
      } else {
        toast.error('Fehler', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      toast.error('Fehler beim Löschen')
    }
  }

  // Gefilterte Anfragen basierend auf Suchbegriff
  const gefilterteAnfragen = anfragen.filter(a => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      a.anfragenummer.toLowerCase().includes(term) ||
      a.kundeName.toLowerCase().includes(term) ||
      a.bauvorhaben.objektname.toLowerCase().includes(term) ||
      a.ansprechpartner?.toLowerCase().includes(term)
    )
  })

  // Statistiken berechnen
  const stats = {
    gesamt: anfragen.length,
    inBearbeitung: anfragen.filter(a => a.status === 'in_bearbeitung' || a.status === 'angebot_in_bearbeitung').length,
    angebotErstellt: anfragen.filter(a => a.status === 'angebot_erstellt').length
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Anfragen</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Kundenanfragen und erstellen Sie Angebote</p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard/admin/anfragen/neu')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Neue Anfrage erstellen
        </Button>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Gesamt</CardTitle>
            <FileQuestion className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.gesamt}</div>
            <p className="text-xs text-gray-600">Alle Anfragen</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">In Bearbeitung</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.inBearbeitung}</div>
            <p className="text-xs text-blue-600">Werden bearbeitet</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Angebot versendet</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.angebotErstellt}</div>
            <p className="text-xs text-green-600">Angebot an Kunde versendet</p>
          </CardContent>
        </Card>
      </div>

      {/* Suchfeld und Filter */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Anfrage suchen (Nummer, Kunde, Bauvorhaben...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="w-full md:w-auto">
              <TabsList className="grid w-full md:w-auto grid-cols-5 bg-gray-100">
                <TabsTrigger value="alle" className="data-[state=active]:bg-white text-xs">Alle</TabsTrigger>
                <TabsTrigger value="offen" className="data-[state=active]:bg-white text-xs">Offen</TabsTrigger>
                <TabsTrigger value="in_bearbeitung" className="data-[state=active]:bg-white text-xs">In Bearb.</TabsTrigger>
                <TabsTrigger value="angebot_in_bearbeitung" className="data-[state=active]:bg-white text-xs">Angeb. Entw.</TabsTrigger>
                <TabsTrigger value="angebot_erstellt" className="data-[state=active]:bg-white text-xs">Versendet</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <AnfrageTabelle 
              anfragen={gefilterteAnfragen} 
              onLoeschen={handleLoeschen}
              onReload={loadAnfragen}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

