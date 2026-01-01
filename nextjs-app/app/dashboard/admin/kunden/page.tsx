"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Users, TrendingUp, DollarSign, AlertCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [kundeToDelete, setKundeToDelete] = useState<{ id: string, name: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showForceDeleteConfirm, setShowForceDeleteConfirm] = useState(false)
  const [forceDeleteConfirmText, setForceDeleteConfirmText] = useState('')
  const [relatedData, setRelatedData] = useState<{ projekte: number, rechnungen: number, angebote: number, anfragen: number, notizen: number } | null>(null)

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

  const handleDialogClose = (updated: boolean, wasImport?: boolean) => {
    setDialogOpen(false)
    setSelectedKunde(undefined)
    if (updated) {
      // Bei KI-Import: Filter auf "inaktiv" setzen, damit neue Kunden sichtbar sind
      if (wasImport) {
        setFilterStatus('inaktiv')
      }
      loadKunden()
    }
  }

  const handleLoeschen = (id: string) => {
    const kundeData = kunden.find(k => k._id === id)
    
    if (kundeData) {
      const name = kundeData.firma || `${kundeData.vorname || ''} ${kundeData.nachname || ''}`.trim()
      setKundeToDelete({
        id,
        name: name || 'Unbenannter Kunde'
      })
      setDeleteError(null)
      setShowForceDeleteConfirm(false)
      setForceDeleteConfirmText('')
      setRelatedData(null)
      setDeleteDialogOpen(true)
    }
  }

  const confirmLoeschen = async (force: boolean = false) => {
    if (!kundeToDelete) return
    
    try {
      const url = force 
        ? `/api/kunden/${kundeToDelete.id}?force=true`
        : `/api/kunden/${kundeToDelete.id}`
        
      const response = await fetch(url, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message || 'Kunde erfolgreich gelöscht')
        loadKunden()
        setDeleteDialogOpen(false)
        setKundeToDelete(null)
        setDeleteError(null)
        setShowForceDeleteConfirm(false)
        setForceDeleteConfirmText('')
        setRelatedData(null)
      } else {
        if (data.hasRelatedData && data.relatedData) {
          setDeleteError(data.fehler || 'Kunde hat zugeordnete Daten')
          setRelatedData(data.relatedData)
          setShowForceDeleteConfirm(true)
          setForceDeleteConfirmText('')
        } else {
          setDeleteError(data.fehler || 'Fehler beim Löschen des Kunden')
          setRelatedData(null)
        }
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      setDeleteError('Ein unerwarteter Fehler ist aufgetreten')
      setRelatedData(null)
    }
  }

  const handleForceDeleteClick = () => {
    setShowForceDeleteConfirm(true)
    setDeleteError(null)
  }

  const handleForceDeleteConfirm = async () => {
    if (forceDeleteConfirmText !== 'LÖSCHEN') {
      toast.error('Bitte geben Sie "LÖSCHEN" ein, um fortzufahren')
      return
    }
    
    await confirmLoeschen(true)
  }

  const handleDeaktivierenStattdessen = async () => {
    if (!kundeToDelete) return
    
    try {
      await handleDeaktivieren(kundeToDelete.id)
      toast.success('Kunde wurde deaktiviert')
      setDeleteDialogOpen(false)
      setKundeToDelete(null)
      setDeleteError(null)
      setShowForceDeleteConfirm(false)
      setForceDeleteConfirmText('')
      setRelatedData(null)
      loadKunden()
    } catch (error) {
      console.error('Fehler beim Deaktivieren:', error)
      toast.error('Fehler beim Deaktivieren des Kunden')
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

      {/* Lösch-Bestätigungsdialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open)
        if (!open) {
          setDeleteError(null)
          setKundeToDelete(null)
          setShowForceDeleteConfirm(false)
          setForceDeleteConfirmText('')
          setRelatedData(null)
        }
      }}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl">
                {showForceDeleteConfirm 
                  ? 'Bestätigung erforderlich' 
                  : deleteError 
                    ? 'Kunde kann nicht gelöscht werden' 
                    : 'Kunden löschen'}
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          
          <div className="space-y-4 pt-2">
          <AlertDialogDescription className="text-sm text-gray-600">
            Möchten Sie diesen Kunden wirklich löschen?
          </AlertDialogDescription>
            {showForceDeleteConfirm && relatedData ? (
              <>
                <AlertDialogDescription className="text-base">
                  Sie sind dabei, den Kunden <strong className="text-gray-900">{kundeToDelete?.name}</strong> und ALLE zugehörigen Daten unwiderruflich zu löschen!
                </AlertDialogDescription>
                
                <div className="bg-red-50 border-2 border-red-300 rounded-md p-4 space-y-3">
                  <p className="text-sm text-red-900 font-bold text-center">🚨 ACHTUNG: KRITISCHE AKTION 🚨</p>
                  
                  <div className="bg-white rounded p-3 space-y-1">
                    <p className="text-sm text-red-900 font-semibold mb-2">Folgende Daten werden UNWIDERRUFLICH gelöscht:</p>
                    <ul className="text-sm text-red-800 space-y-1">
                      {relatedData.projekte > 0 && <li>✗ {relatedData.projekte} Projekt(e)</li>}
                      {relatedData.rechnungen > 0 && <li>✗ {relatedData.rechnungen} Rechnung(en)</li>}
                      {relatedData.angebote > 0 && <li>✗ {relatedData.angebote} Angebot(e)</li>}
                      {relatedData.anfragen > 0 && <li>✗ {relatedData.anfragen} Anfrage(n)</li>}
                      {relatedData.notizen > 0 && <li>✗ {relatedData.notizen} Notiz(en)</li>}
                      <li className="font-bold mt-2">✗ Alle zugehörigen Dokumente</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <p className="text-sm text-red-900 font-medium">
                      Geben Sie zur Bestätigung das Wort <strong className="text-red-600">"LÖSCHEN"</strong> ein:
                    </p>
                    <Input
                      value={forceDeleteConfirmText}
                      onChange={(e) => setForceDeleteConfirmText(e.target.value.toUpperCase())}
                      placeholder="LÖSCHEN"
                      className="text-center font-bold text-lg border-red-300 focus:border-red-500"
                    />
                  </div>
                </div>
              </>
            ) : deleteError && relatedData ? (
              <>
                <AlertDialogDescription className="text-base">
                  Der Kunde <strong className="text-gray-900">{kundeToDelete?.name}</strong> hat zugeordnete Daten.
                </AlertDialogDescription>
                
                <div className="bg-amber-50 border border-amber-300 rounded-md p-3 space-y-2">
                  <p className="text-sm text-amber-900 font-medium">📊 Zugeordnete Daten:</p>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {relatedData.projekte > 0 && <li>• {relatedData.projekte} Projekt(e)</li>}
                    {relatedData.rechnungen > 0 && <li>• {relatedData.rechnungen} Rechnung(en)</li>}
                    {relatedData.angebote > 0 && <li>• {relatedData.angebote} Angebot(e)</li>}
                    {relatedData.anfragen > 0 && <li>• {relatedData.anfragen} Anfrage(n)</li>}
                    {relatedData.notizen > 0 && <li>• {relatedData.notizen} Notiz(en)</li>}
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
                  <p className="text-sm text-blue-900 font-medium">💡 Empfehlung:</p>
                  <p className="text-sm text-blue-800">
                    Deaktivieren Sie den Kunden. Dadurch bleiben alle Daten erhalten, 
                    aber der Kunde wird als inaktiv markiert.
                  </p>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
                  <p className="text-sm text-red-900 font-medium">⚠️ Alternative:</p>
                  <p className="text-sm text-red-800">
                    Sie können den Kunden trotzdem löschen. Dabei werden ALLE zugehörigen Daten 
                    (Projekte, Rechnungen, Angebote, etc.) unwiderruflich gelöscht!
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertDialogDescription className="text-base">
                  Möchten Sie den Kunden <strong className="text-gray-900">{kundeToDelete?.name}</strong> wirklich dauerhaft löschen?
                </AlertDialogDescription>
                
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
                  <p className="text-sm text-amber-900 font-medium">⚠️ Wichtige Hinweise:</p>
                  <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                    <li>Diese Aktion kann nicht rückgängig gemacht werden</li>
                    <li>Falls der Kunde Projekte, Angebote oder Rechnungen hat, wird eine zusätzliche Bestätigung erforderlich sein</li>
                  </ul>
                </div>
              </>
            )}
          </div>
          
          <AlertDialogFooter>
            {showForceDeleteConfirm ? (
              <>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowForceDeleteConfirm(false)
                    setForceDeleteConfirmText('')
                  }}
                >
                  Zurück
                </Button>
                <Button 
                  onClick={handleForceDeleteConfirm}
                  disabled={forceDeleteConfirmText !== 'LÖSCHEN'}
                  className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Alles unwiderruflich löschen
                </Button>
              </>
            ) : deleteError && relatedData ? (
              <>
                <AlertDialogCancel className="bg-white hover:bg-gray-50">
                  Abbrechen
                </AlertDialogCancel>
                <Button 
                  onClick={handleDeaktivierenStattdessen}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Kunde deaktivieren
                </Button>
                <Button 
                  onClick={handleForceDeleteClick}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Trotzdem löschen
                </Button>
              </>
            ) : (
              <>
                <AlertDialogCancel className="bg-white hover:bg-gray-50">
                  Abbrechen
                </AlertDialogCancel>
                <Button 
                  onClick={() => confirmLoeschen(false)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Löschen
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

