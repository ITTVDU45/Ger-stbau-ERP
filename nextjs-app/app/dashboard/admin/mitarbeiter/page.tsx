"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  UserPlus, 
  Search,
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
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
import { Mitarbeiter } from '@/lib/db/types'
import MitarbeiterTabelle from './components/MitarbeiterTabelle'
import MitarbeiterDialog from './components/MitarbeiterDialog'

export default function MitarbeiterPage() {
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<Mitarbeiter | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [kpiFilter, setKpiFilter] = useState<'alle' | 'aktiv' | 'festangestellt' | 'aushilfe' | 'subunternehmer'>('aktiv')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mitarbeiterToDelete, setMitarbeiterToDelete] = useState<{ id: string, name: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showForceDeleteConfirm, setShowForceDeleteConfirm] = useState(false)
  const [forceDeleteConfirmText, setForceDeleteConfirmText] = useState('')
  const [relatedData, setRelatedData] = useState<{ zeiteintraege: number, projekte: number, urlaube: number, dokumente: number } | null>(null)

  useEffect(() => {
    loadMitarbeiter()
  }, [])

  const loadMitarbeiter = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/mitarbeiter')
      if (response.ok) {
        const data = await response.json()
        setMitarbeiter(data.mitarbeiter || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNeuerMitarbeiter = () => {
    setSelectedMitarbeiter(undefined)
    setDialogOpen(true)
  }

  const handleBearbeiten = (mitarbeiter: Mitarbeiter) => {
    setSelectedMitarbeiter(mitarbeiter)
    setDialogOpen(true)
  }

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false)
    setSelectedMitarbeiter(undefined)
    if (updated) {
      loadMitarbeiter()
    }
  }

  const handleLoeschen = (id: string) => {
    const mitarbeiterData = mitarbeiter.find(m => m._id === id)
    if (mitarbeiterData) {
      setMitarbeiterToDelete({
        id,
        name: `${mitarbeiterData.vorname} ${mitarbeiterData.nachname}`
      })
      setDeleteError(null)
      setShowForceDeleteConfirm(false)
      setForceDeleteConfirmText('')
      setRelatedData(null)
      setDeleteDialogOpen(true)
    }
  }

  const confirmLoeschen = async (force: boolean = false) => {
    if (!mitarbeiterToDelete) return
    
    try {
      const url = force 
        ? `/api/mitarbeiter/${mitarbeiterToDelete.id}?force=true`
        : `/api/mitarbeiter/${mitarbeiterToDelete.id}`
        
      const response = await fetch(url, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message || 'Mitarbeiter erfolgreich gelöscht')
        loadMitarbeiter()
        setDeleteDialogOpen(false)
        setMitarbeiterToDelete(null)
        setDeleteError(null)
        setShowForceDeleteConfirm(false)
        setForceDeleteConfirmText('')
        setRelatedData(null)
      } else {
        if (data.hasRelatedData && data.relatedData) {
          setDeleteError(data.fehler || 'Mitarbeiter hat zugeordnete Daten')
          setRelatedData(data.relatedData)
          setShowForceDeleteConfirm(true)
          setForceDeleteConfirmText('')
        } else {
          setDeleteError(data.fehler || 'Fehler beim Löschen des Mitarbeiters')
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

  const filteredMitarbeiter = mitarbeiter.filter(m => {
    const matchesSearch = searchTerm === '' || 
      m.vorname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nachname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesKpiFilter = 
      kpiFilter === 'alle' ||
      (kpiFilter === 'aktiv' && m.aktiv) ||
      (kpiFilter === 'festangestellt' && m.beschaeftigungsart === 'festangestellt') ||
      (kpiFilter === 'aushilfe' && m.beschaeftigungsart === 'aushilfe') ||
      (kpiFilter === 'subunternehmer' && m.beschaeftigungsart === 'subunternehmer')
    
    return matchesSearch && matchesKpiFilter
  })

  const stats = {
    gesamt: mitarbeiter.length,
    aktiv: mitarbeiter.filter(m => m.aktiv).length,
    festangestellt: mitarbeiter.filter(m => m.beschaeftigungsart === 'festangestellt').length,
    aushilfe: mitarbeiter.filter(m => m.beschaeftigungsart === 'aushilfe').length,
    subunternehmer: mitarbeiter.filter(m => m.beschaeftigungsart === 'subunternehmer').length,
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl text-gray-900">Mitarbeiter-Verwaltung</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-700">
                Verwalten Sie alle Mitarbeiter, Qualifikationen und Einsätze
              </CardDescription>
            </div>
            <Button onClick={handleNeuerMitarbeiter} className="hidden md:flex bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Neuer Mitarbeiter
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      {/* Mobile FAB */}
      <FloatingActionButton 
        onClick={handleNeuerMitarbeiter}
        label="Neuer Mitarbeiter"
        icon={<UserPlus className="h-6 w-6" />}
      />

      {/* Statistiken */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            kpiFilter === 'alle' 
              ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-400' 
              : 'bg-white border-gray-200'
          }`}
          onClick={() => setKpiFilter('alle')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesamt</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.gesamt}</div>
            <p className="text-xs text-gray-600 mt-1">Alle Mitarbeiter</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            kpiFilter === 'aktiv' 
              ? 'bg-green-100 border-green-400 ring-2 ring-green-400' 
              : 'bg-white border-green-200'
          }`}
          onClick={() => setKpiFilter('aktiv')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Aktiv</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.aktiv}</div>
            <p className="text-xs text-gray-600 mt-1">Aktive Mitarbeiter</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            kpiFilter === 'festangestellt' 
              ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400' 
              : 'bg-white border-blue-200'
          }`}
          onClick={() => setKpiFilter('festangestellt')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Festangestellt</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.festangestellt}</div>
            <p className="text-xs text-gray-600 mt-1">Festangestellte</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            kpiFilter === 'aushilfe' 
              ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-400' 
              : 'bg-white border-purple-200'
          }`}
          onClick={() => setKpiFilter('aushilfe')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Aushilfen</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.aushilfe}</div>
            <p className="text-xs text-gray-600 mt-1">Aushilfen</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            kpiFilter === 'subunternehmer' 
              ? 'bg-orange-100 border-orange-400 ring-2 ring-orange-400' 
              : 'bg-white border-orange-200'
          }`}
          onClick={() => setKpiFilter('subunternehmer')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Subunternehmer</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.subunternehmer}</div>
            <p className="text-xs text-gray-600 mt-1">Subunternehmer</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Suche */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Mitarbeiter suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-600 whitespace-nowrap">
              {filteredMitarbeiter.length} {filteredMitarbeiter.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'} gefunden
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MitarbeiterTabelle
            mitarbeiter={filteredMitarbeiter}
            loading={loading}
            onBearbeiten={handleBearbeiten}
            onLoeschen={handleLoeschen}
          />
        </CardContent>
      </Card>

      {/* Dialog */}
      <MitarbeiterDialog
        open={dialogOpen}
        mitarbeiter={selectedMitarbeiter}
        onClose={handleDialogClose}
      />

      {/* Lösch-Bestätigungsdialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open)
        if (!open) {
          setDeleteError(null)
          setMitarbeiterToDelete(null)
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
                  : 'Mitarbeiter löschen'}
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          
          <div className="space-y-4 pt-2">
          <AlertDialogDescription className="text-sm text-gray-600">
            Möchten Sie diesen Mitarbeiter wirklich löschen?
          </AlertDialogDescription>
            {showForceDeleteConfirm && relatedData ? (
              <>
                <AlertDialogDescription className="text-base">
                  Sie sind dabei, den Mitarbeiter <strong className="text-gray-900">{mitarbeiterToDelete?.name}</strong> und ALLE zugehörigen Daten unwiderruflich zu löschen!
                </AlertDialogDescription>
                
                <div className="bg-red-50 border-2 border-red-300 rounded-md p-4 space-y-3">
                  <p className="text-sm text-red-900 font-bold text-center">🚨 ACHTUNG: KRITISCHE AKTION 🚨</p>
                  
                  <div className="bg-white rounded p-3 space-y-1">
                    <p className="text-sm text-red-900 font-semibold mb-2">Folgende Daten werden UNWIDERRUFLICH gelöscht:</p>
                    <ul className="text-sm text-red-800 space-y-1">
                      {relatedData.zeiteintraege > 0 && <li>✗ {relatedData.zeiteintraege} Zeiteintrag/-einträge</li>}
                      {relatedData.projekte > 0 && <li>✗ {relatedData.projekte} Projektzuordnung(en)</li>}
                      {relatedData.urlaube > 0 && <li>✗ {relatedData.urlaube} Urlaub(e)</li>}
                      {relatedData.dokumente > 0 && <li>✗ {relatedData.dokumente} Dokument(e)</li>}
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
                  Der Mitarbeiter <strong className="text-gray-900">{mitarbeiterToDelete?.name}</strong> hat zugeordnete Daten.
                </AlertDialogDescription>
                
                <div className="bg-amber-50 border border-amber-300 rounded-md p-3 space-y-2">
                  <p className="text-sm text-amber-900 font-medium">📊 Zugeordnete Daten:</p>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {relatedData.zeiteintraege > 0 && <li>• {relatedData.zeiteintraege} Zeiteintrag/-einträge</li>}
                    {relatedData.projekte > 0 && <li>• {relatedData.projekte} Projektzuordnung(en)</li>}
                    {relatedData.urlaube > 0 && <li>• {relatedData.urlaube} Urlaub(e)</li>}
                    {relatedData.dokumente > 0 && <li>• {relatedData.dokumente} Dokument(e)</li>}
                  </ul>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
                  <p className="text-sm text-red-900 font-medium">⚠️ Hinweis:</p>
                  <p className="text-sm text-red-800">
                    Sie können den Mitarbeiter trotzdem löschen. Dabei werden ALLE zugehörigen Daten 
                    (Zeiterfassung, Urlaube, Dokumente, etc.) unwiderruflich gelöscht!
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertDialogDescription className="text-base">
                  Möchten Sie den Mitarbeiter <strong className="text-gray-900">{mitarbeiterToDelete?.name}</strong> wirklich dauerhaft löschen?
                </AlertDialogDescription>
                
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
                  <p className="text-sm text-amber-900 font-medium">⚠️ Wichtige Hinweise:</p>
                  <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                    <li>Diese Aktion kann nicht rückgängig gemacht werden</li>
                    <li>Falls der Mitarbeiter Zeiteinträge, Projekte oder Urlaube hat, wird eine zusätzliche Bestätigung erforderlich sein</li>
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

