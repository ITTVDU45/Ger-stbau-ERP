'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Edit, FileText, Receipt } from 'lucide-react'
import { Projekt } from '@/lib/db/types'
import { toast } from 'sonner'
import ProjektUebersichtTab from '../components/ProjektUebersichtTab'
import ProjektKundeTab from '../components/ProjektKundeTab'
import ProjektAngeboteTab from '../components/ProjektAngeboteTab'
import ProjektRechnungenTab from '../components/ProjektRechnungenTab'
import ProjektDokumenteTab from '../components/ProjektDokumenteTab'
import ProjektMitarbeiterTab from '../components/ProjektMitarbeiterTab'
import ProjektAnfragenTab from '../components/ProjektAnfragenTab'
import ProjektKalkulationTab from '../components/ProjektKalkulationTab'
import ProjektAktivitaetenSidebar from '../components/ProjektAktivitaetenSidebar'
import ManuelleRechnungDialog from '../components/ManuelleRechnungDialog'

export default function ProjektDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [projekt, setProjekt] = useState<Projekt | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('uebersicht')
  const [anfragenCount, setAnfragenCount] = useState(0)

  useEffect(() => {
    if (id) {
      loadProjekt()
    }
  }, [id])

  // Initialisiere Anfragen-Count basierend auf projekt.anfrageIds und Angebot
  useEffect(() => {
    if (projekt) {
      const initialCount = projekt.anfrageIds?.length || 0
      setAnfragenCount(initialCount)
      
      // Prüfe ob es eine zusätzliche Anfrage über das Angebot gibt
      if (projekt.angebotId && initialCount === 0) {
        // Lade Angebot um zu prüfen ob es eine anfrageId hat
        fetch(`/api/angebote/${projekt.angebotId}`)
          .then(res => res.json())
          .then(data => {
            if (data.erfolg && data.angebot?.anfrageId) {
              // Prüfe ob diese Anfrage bereits in anfrageIds ist
              const istBereitsInIds = projekt.anfrageIds?.includes(data.angebot.anfrageId)
              if (!istBereitsInIds) {
                setAnfragenCount(1)
              }
            }
          })
          .catch(error => {
            console.error('Fehler beim Laden des Angebots für Anfragen-Count:', error)
          })
      }
    }
  }, [projekt])

  const loadProjekt = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projekte/${id}`)
      const data = await response.json()
      
      if (data.erfolg) {
        setProjekt(data.projekt)
      } else {
        toast.error('Fehler beim Laden des Projekts')
        router.push('/dashboard/admin/projekte')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: Projekt['status']) => {
    const statusConfig = {
      in_planung: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: 'In Planung' },
      aktiv: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Aktiv' },
      in_abrechnung: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'In Abrechnung' },
      abgeschlossen: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', label: 'Abgeschlossen' },
      pausiert: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', label: 'Pausiert' },
    }
    const config = statusConfig[status]
    return (
      <Badge variant="outline" className={`${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!projekt) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">Projekt nicht gefunden</p>
      </div>
    )
  }

  // TabsList JSX zur Wiederverwendung
  const tabsList = (
    <TabsList className="inline-flex w-full h-auto flex-wrap bg-gray-100 p-1 gap-1">
      <TabsTrigger value="uebersicht" className="data-[state=active]:bg-white flex-shrink-0">Übersicht</TabsTrigger>
      <TabsTrigger value="kunde" className="data-[state=active]:bg-white flex-shrink-0">Kunde</TabsTrigger>
      <TabsTrigger value="kalkulation" className="data-[state=active]:bg-white flex-shrink-0">Kalkulation</TabsTrigger>
      <TabsTrigger value="anfragen" className="data-[state=active]:bg-white flex-shrink-0">
        Anfragen ({anfragenCount})
      </TabsTrigger>
      <TabsTrigger value="angebote" className="data-[state=active]:bg-white flex-shrink-0">
        Angebote
      </TabsTrigger>
      <TabsTrigger value="rechnungen" className="data-[state=active]:bg-white flex-shrink-0">
        Rechnungen
      </TabsTrigger>
      <TabsTrigger value="mitarbeiter" className="data-[state=active]:bg-white flex-shrink-0">
        Mitarbeiter ({projekt.zugewieseneMitarbeiter?.length || 0})
      </TabsTrigger>
      <TabsTrigger value="dokumente" className="data-[state=active]:bg-white flex-shrink-0">
        Dokumente ({projekt.dokumente?.length || 0})
      </TabsTrigger>
    </TabsList>
  )

  // Alle TabsContent zur Wiederverwendung
  const tabsContent = (
    <>
      <TabsContent value="uebersicht">
        <ProjektUebersichtTab projekt={projekt} />
      </TabsContent>

      <TabsContent value="kunde">
        <ProjektKundeTab projekt={projekt} />
      </TabsContent>

      <TabsContent value="kalkulation">
        <ProjektKalkulationTab projekt={projekt} onProjektUpdated={loadProjekt} />
      </TabsContent>

      <TabsContent value="anfragen">
        <ProjektAnfragenTab 
          projekt={projekt} 
          onProjektUpdated={loadProjekt}
          onAnfragenCountChange={setAnfragenCount}
        />
      </TabsContent>

      <TabsContent value="angebote">
        <ProjektAngeboteTab projekt={projekt} onProjektUpdated={loadProjekt} />
      </TabsContent>

      <TabsContent value="rechnungen">
        <ProjektRechnungenTab projekt={projekt} onProjektUpdated={loadProjekt} />
      </TabsContent>

      <TabsContent value="mitarbeiter">
        <ProjektMitarbeiterTab projekt={projekt} onProjektUpdated={loadProjekt} />
      </TabsContent>

      <TabsContent value="dokumente">
        <ProjektDokumenteTab projekt={projekt} onProjektUpdated={loadProjekt} />
      </TabsContent>
    </>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/admin/projekte')}
            className="text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{projekt.projektname}</h1>
              {getStatusBadge(projekt.status)}
            </div>
            <p className="text-gray-600 mt-1">Projektnummer: {projekt.projektnummer}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/admin/projekte/neu?id=${id}`)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
          
          {projekt.angebotId && (
            <Button
              onClick={() => setActiveTab('rechnungen')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              Rechnung aus Angebot
            </Button>
          )}
          
          <ManuelleRechnungDialog projekt={projekt} onSuccess={loadProjekt}>
            <Button
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <Receipt className="mr-2 h-4 w-4" />
              Rechnung ohne Angebot
            </Button>
          </ManuelleRechnungDialog>
        </div>
      </div>

      {/* Info-Karten über den Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Kunde</h3>
          <p className="text-lg font-semibold text-gray-900">{projekt.kundeName || 'Nicht zugewiesen'}</p>
        </Card>
        
        <Card className="p-4 bg-white border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Zeitraum</h3>
          <p className="text-lg font-semibold text-gray-900">
            {projekt.startdatum 
              ? new Date(projekt.startdatum).toLocaleDateString('de-DE')
              : 'Nicht festgelegt'
            }
            {' - '}
            {projekt.enddatum 
              ? new Date(projekt.enddatum).toLocaleDateString('de-DE')
              : 'Offen'
            }
          </p>
        </Card>
        
        <Card className="p-4 bg-white border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Angebotssumme</h3>
          <p className="text-lg font-semibold text-gray-900">
            {projekt.angebotssumme && projekt.angebotssumme > 0
              ? `${projekt.angebotssumme.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
              : 'Kein Angebot zugewiesen'
            }
          </p>
        </Card>
      </div>

      {/* Main Layout: Conditional basierend auf activeTab */}
      {activeTab === 'kalkulation' ? (
        // Volle Breite für Kalkulation + Sidebar unten
        <div className="space-y-6">
          {/* Kalkulations-Tabs in voller Breite */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {tabsList}
            {tabsContent}
          </Tabs>
          
          {/* Aktivitäten-Sidebar unten */}
          <ProjektAktivitaetenSidebar projekt={projekt} />
        </div>
      ) : (
        // Grid-Layout für alle anderen Tabs
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {tabsList}
              {tabsContent}
            </Tabs>
          </div>

          {/* Aktivitäten-Sidebar rechts */}
          <div className="lg:col-span-1">
            <ProjektAktivitaetenSidebar projekt={projekt} />
          </div>
        </div>
      )}
    </div>
  )
}

