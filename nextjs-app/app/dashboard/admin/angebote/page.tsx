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
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export default function AngebotePage() {
  const router = useRouter()
  const [angebote, setAngebote] = useState<Angebot[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'alle' | 'entwurf' | 'gesendet'>('alle')
  const [filterTyp, setFilterTyp] = useState<'alle' | 'dachdecker' | 'maler' | 'bauunternehmen'>('alle')
  
  // Lösch-Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'initial' | 'confirm' | 'force'>('initial')
  const [angebotToDelete, setAngebotToDelete] = useState<Angebot | null>(null)
  const [verknuepfteDaten, setVerknuepfteDaten] = useState<any>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleLoeschen = async (angebot: Angebot) => {
    setAngebotToDelete(angebot)
    setDeleteStep('initial')
    setVerknuepfteDaten(null)
    setDeleteConfirmText('')
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!angebotToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/angebote/${angebotToDelete._id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok && data.erfolg) {
        toast.success('Angebot gelöscht', {
          description: `Angebot ${angebotToDelete.angebotsnummer} wurde erfolgreich gelöscht`
        })
        setDeleteDialogOpen(false)
        loadAngebote()
      } else if (data.requiresForce) {
        // Verknüpfte Daten gefunden
        setVerknuepfteDaten(data.verknuepfteDaten)
        setDeleteStep('confirm')
      } else {
        toast.error('Fehler beim Löschen', {
          description: data.fehler || 'Ein unbekannter Fehler ist aufgetreten'
        })
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      toast.error('Fehler beim Löschen des Angebots')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleForceDelete = async () => {
    if (!angebotToDelete || deleteConfirmText !== 'LÖSCHEN') {
      toast.error('Bitte geben Sie "LÖSCHEN" ein, um fortzufahren')
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/angebote/${angebotToDelete._id}?force=true`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok && data.erfolg) {
        toast.success('Angebot und verknüpfte Daten gelöscht', {
          description: `Angebot ${angebotToDelete.angebotsnummer} und alle verknüpften Daten wurden gelöscht`
        })
        setDeleteDialogOpen(false)
        setDeleteStep('initial')
        setDeleteConfirmText('')
        setVerknuepfteDaten(null)
        loadAngebote()
      } else {
        toast.error('Fehler beim Löschen', {
          description: data.fehler || 'Ein unbekannter Fehler ist aufgetreten'
        })
      }
    } catch (error) {
      console.error('Fehler beim Force-Delete:', error)
      toast.error('Fehler beim Löschen des Angebots')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDialogClose = () => {
    if (!isDeleting) {
      setDeleteDialogOpen(false)
      setDeleteStep('initial')
      setAngebotToDelete(null)
      setVerknuepfteDaten(null)
      setDeleteConfirmText('')
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

      {/* Lösch-Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDialogClose}>
        <AlertDialogContent className="bg-white max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">
              {deleteStep === 'initial' && 'Angebot löschen?'}
              {deleteStep === 'confirm' && '⚠️ Verknüpfte Daten gefunden'}
              {deleteStep === 'force' && '🚨 Endgültig löschen'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deleteStep === 'initial' && angebotToDelete && (
                  <>
                    <p className="text-gray-700">
                      Möchten Sie das Angebot <strong className="text-gray-900">{angebotToDelete.angebotsnummer}</strong> wirklich löschen?
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700"><strong>Kunde:</strong> {angebotToDelete.kundeName}</p>
                      <p className="text-sm text-gray-700"><strong>Status:</strong> {angebotToDelete.status}</p>
                      {angebotToDelete.brutto && (
                        <p className="text-sm text-gray-700">
                          <strong>Summe:</strong> {angebotToDelete.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                        </p>
                      )}
                    </div>
                  </>
                )}

                {deleteStep === 'confirm' && verknuepfteDaten && (
                  <>
                    <p className="text-gray-700">
                      Dieses Angebot ist mit folgenden Daten verknüpft:
                    </p>
                    
                    {verknuepfteDaten.projekte > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-blue-900 mb-2">
                          📁 {verknuepfteDaten.projekte} Projekt(e)
                        </p>
                        <div className="space-y-1">
                          {verknuepfteDaten.projekteDetails?.map((p: any) => (
                            <div key={p.id} className="text-sm text-blue-800">
                              • {p.nummer} - {p.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {verknuepfteDaten.rechnungen > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-orange-900 mb-2">
                          📄 {verknuepfteDaten.rechnungen} Rechnung(en)
                        </p>
                        <div className="space-y-1">
                          {verknuepfteDaten.rechnungenDetails?.map((r: any) => (
                            <div key={r.id} className="text-sm text-orange-800">
                              • {r.nummer} - {r.betrag.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                      <p className="text-sm text-red-900">
                        <strong>⚠️ Warnung:</strong> Wenn Sie fortfahren, werden:
                      </p>
                      <ul className="list-disc list-inside text-sm text-red-800 mt-2 space-y-1">
                        {verknuepfteDaten.projekte > 0 && (
                          <li>Die Angebot-Referenz aus {verknuepfteDaten.projekte} Projekt(en) entfernt</li>
                        )}
                        {verknuepfteDaten.rechnungen > 0 && (
                          <li>{verknuepfteDaten.rechnungen} Rechnung(en) unwiderruflich gelöscht</li>
                        )}
                      </ul>
                    </div>
                  </>
                )}

                {deleteStep === 'force' && (
                  <>
                    <p className="text-gray-700">
                      Diese Aktion kann <strong className="text-red-600">nicht rückgängig</strong> gemacht werden!
                    </p>
                    <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                      <Label htmlFor="deleteConfirm" className="text-sm font-medium text-red-900">
                        Geben Sie <strong>LÖSCHEN</strong> ein, um fortzufahren:
                      </Label>
                      <Input
                        id="deleteConfirm"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="LÖSCHEN"
                        className="mt-2 border-red-300 focus:border-red-500 focus:ring-red-500"
                        autoComplete="off"
                      />
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {deleteStep === 'initial' && (
              <>
                <AlertDialogCancel disabled={isDeleting} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Abbrechen
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? 'Wird gelöscht...' : 'Angebot löschen'}
                </AlertDialogAction>
              </>
            )}

            {deleteStep === 'confirm' && (
              <>
                <AlertDialogCancel disabled={isDeleting} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Abbrechen
                </AlertDialogCancel>
                <Button
                  onClick={() => setDeleteStep('force')}
                  disabled={isDeleting}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Trotzdem löschen
                </Button>
              </>
            )}

            {deleteStep === 'force' && (
              <>
                <AlertDialogCancel disabled={isDeleting} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Abbrechen
                </AlertDialogCancel>
                <Button
                  onClick={handleForceDelete}
                  disabled={isDeleting || deleteConfirmText !== 'LÖSCHEN'}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Wird gelöscht...' : 'Endgültig löschen'}
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

