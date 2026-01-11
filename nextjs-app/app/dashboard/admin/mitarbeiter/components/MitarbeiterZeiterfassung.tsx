"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zeiterfassung } from '@/lib/db/types'
import { Clock, Calendar, AlertCircle, Plus, FileText, Download, X, Eye, Check, XCircle, Edit2, Trash2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'
import ZeiterfassungDialog from '@/components/dialogs/ZeiterfassungDialog'
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

interface MitarbeiterZeiterfassungProps {
  mitarbeiterId: string
  mitarbeiterName: string
}

export default function MitarbeiterZeiterfassung({ mitarbeiterId, mitarbeiterName }: MitarbeiterZeiterfassungProps) {
  const [zeiterfassungen, setZeiterfassungen] = useState<Zeiterfassung[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [projektDetailsOpen, setProjektDetailsOpen] = useState(false)
  const [selectedProjektId, setSelectedProjektId] = useState<string | undefined>(undefined)
  const [editingEintrag, setEditingEintrag] = useState<Zeiterfassung | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<'first' | 'second'>('first')
  const [eintragToDelete, setEintragToDelete] = useState<Zeiterfassung | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadZeiterfassungen()
  }, [mitarbeiterId])

  // Automatisch neu laden, wenn Tab im Fokus ist
  useEffect(() => {
    const handleFocus = () => {
      loadZeiterfassungen()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [mitarbeiterId])

  const loadZeiterfassungen = async () => {
    try {
      setLoading(true)
      setApiError(false)
      const response = await fetch(`/api/zeiterfassung?mitarbeiterId=${mitarbeiterId}`)
      
      if (response.status === 404) {
        // API existiert noch nicht
        setApiError(true)
        setZeiterfassungen([])
      } else if (response.ok) {
        const data = await response.json()
        setZeiterfassungen(data.zeiterfassungen || [])
      } else {
        setApiError(true)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Zeiterfassungen:', error)
      setApiError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleNeueZeiterfassung = () => {
    setDialogOpen(true)
  }

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false)
    setEditingEintrag(undefined)
    if (updated) {
      loadZeiterfassungen()
    }
  }

  const handleProjektDetails = (projektId?: string) => {
    setSelectedProjektId(projektId)
    setProjektDetailsOpen(true)
  }

  const handleEintragBearbeiten = (eintrag: Zeiterfassung) => {
    setEditingEintrag(eintrag)
    setDialogOpen(true)
    setProjektDetailsOpen(false)
  }

  const handleEintragFreigeben = async (eintragId: string) => {
    try {
      const response = await fetch(`/api/zeiterfassung/${eintragId}/freigeben`, {
        method: 'POST'
      })
      
      if (response.ok) {
        toast.success('Zeiteintrag erfolgreich freigegeben')
        loadZeiterfassungen()
      } else {
        const data = await response.json()
        toast.error(data.fehler || 'Fehler beim Freigeben')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Freigeben')
    }
  }

  const handleEintragAblehnen = async (eintragId: string) => {
    try {
      const response = await fetch(`/api/zeiterfassung/${eintragId}/ablehnen`, {
        method: 'POST'
      })
      
      if (response.ok) {
        toast.success('Zeiteintrag abgelehnt')
        loadZeiterfassungen()
      } else {
        const data = await response.json()
        toast.error(data.fehler || 'Fehler beim Ablehnen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Ablehnen')
    }
  }

  const handleEintragLoeschen = (eintrag: Zeiterfassung) => {
    setEintragToDelete(eintrag)
    setDeleteConfirmStep('first')
    setDeleteConfirmText('')
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!eintragToDelete || !eintragToDelete._id) return

    if (deleteConfirmStep === 'first') {
      // Erste Bestätigung - gehe zu zweiter
      setDeleteConfirmStep('second')
      return
    }

    // Zweite Bestätigung - prüfe Text-Eingabe
    if (deleteConfirmText !== 'LÖSCHEN') {
      toast.error('Bitte geben Sie "LÖSCHEN" ein, um fortzufahren')
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/zeiterfassung/${eintragToDelete._id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Zeiteintrag erfolgreich gelöscht', {
          description: `${eintragToDelete.stunden} Std. vom ${format(new Date(eintragToDelete.datum), 'dd.MM.yyyy', { locale: de })} wurden gelöscht`
        })
        setDeleteDialogOpen(false)
        setDeleteConfirmStep('first')
        setDeleteConfirmText('')
        setEintragToDelete(null)
        loadZeiterfassungen()
      } else {
        const data = await response.json()
        toast.error('Fehler beim Löschen', {
          description: data.fehler || 'Ein unbekannter Fehler ist aufgetreten'
        })
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Löschen des Zeiteintrags')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteDialogClose = () => {
    if (!isDeleting) {
      setDeleteDialogOpen(false)
      setDeleteConfirmStep('first')
      setDeleteConfirmText('')
      setEintragToDelete(null)
    }
  }

  const handlePDFVorschau = () => {
    setPdfPreviewOpen(true)
  }

  const handlePDFDownload = async () => {
    try {
      setGeneratingPdf(true)
      const response = await fetch(`/api/mitarbeiter/${mitarbeiterId}/zeiterfassung-pdf`)
      
      if (!response.ok) {
        throw new Error('PDF-Generierung fehlgeschlagen')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Stundenuebersicht-${mitarbeiterName.replace(/\s/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF erfolgreich heruntergeladen')
    } catch (error) {
      console.error('Fehler beim PDF-Download:', error)
      toast.error('Fehler beim Generieren des PDFs')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, label: string, class: string }> = {
      offen: { variant: 'outline', label: 'Offen', class: 'border-gray-400' },
      freigegeben: { variant: 'default', label: 'Freigegeben', class: 'bg-green-600' },
      abgelehnt: { variant: 'default', label: 'Abgelehnt', class: 'bg-red-600' }
    }
    const config = variants[status] || { variant: 'outline', label: status, class: '' }
    return <Badge variant={config.variant} className={config.class}>{config.label}</Badge>
  }

  // Berechne Statistiken
  const stats = {
    gesamt: zeiterfassungen.reduce((sum, z) => sum + z.stunden, 0),
    freigegeben: zeiterfassungen.filter(z => z.status === 'freigegeben').reduce((sum, z) => sum + z.stunden, 0),
    offen: zeiterfassungen.filter(z => z.status === 'offen').reduce((sum, z) => sum + z.stunden, 0)
  }

  // Gruppiere Zeiterfassungen nach Projekt
  const stundenProProjekt = zeiterfassungen.reduce((acc, zeit) => {
    const projektKey = zeit.projektId || 'ohne-projekt'
    const projektName = zeit.projektName || 'Ohne Projekt'
    
    if (!acc[projektKey]) {
      acc[projektKey] = {
        projektId: zeit.projektId,
        projektName: projektName,
        gesamtStunden: 0,
        freigegebeneStunden: 0,
        offeneStunden: 0,
        abgelehntStunden: 0,
        eintraege: 0
      }
    }
    
    acc[projektKey].gesamtStunden += zeit.stunden
    acc[projektKey].eintraege += 1
    
    if (zeit.status === 'freigegeben') {
      acc[projektKey].freigegebeneStunden += zeit.stunden
    } else if (zeit.status === 'offen') {
      acc[projektKey].offeneStunden += zeit.stunden
    } else if (zeit.status === 'abgelehnt') {
      acc[projektKey].abgelehntStunden += zeit.stunden
    }
    
    return acc
  }, {} as Record<string, {
    projektId?: string
    projektName: string
    gesamtStunden: number
    freigegebeneStunden: number
    offeneStunden: number
    abgelehntStunden: number
    eintraege: number
  }>)

  const projektStunden = Object.values(stundenProProjekt).sort((a, b) => b.gesamtStunden - a.gesamtStunden)

  if (loading) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Lade Zeiterfassungen...</p>
        </CardContent>
      </Card>
    )
  }

  if (apiError) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Zeiterfassung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">API noch nicht verfügbar</p>
            <p className="text-gray-500 text-sm">
              Die Zeiterfassungs-API ist noch nicht implementiert.<br />
              Dieser Bereich wird aktiviert, sobald die API verfügbar ist.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Aktions-Buttons */}
      <div className="flex justify-end gap-2">
        <Button 
          onClick={() => loadZeiterfassungen()} 
          variant="outline" 
          className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 text-gray-700 ${loading ? 'animate-spin' : ''}`} />
          <span className="font-medium">Aktualisieren</span>
        </Button>
        <Button 
          onClick={handlePDFVorschau} 
          variant="outline" 
          className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
          disabled={zeiterfassungen.length === 0}
        >
          <FileText className="h-4 w-4 mr-2 text-gray-700" />
          <span className="font-medium">PDF Vorschau</span>
        </Button>
        <Button 
          onClick={handlePDFDownload} 
          variant="outline" 
          className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
          disabled={zeiterfassungen.length === 0 || generatingPdf}
        >
          {generatingPdf ? (
            <>
              <Clock className="h-4 w-4 mr-2 text-gray-700 animate-spin" />
              <span className="font-medium">Generiere PDF...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2 text-gray-700" />
              <span className="font-medium">PDF Download</span>
            </>
          )}
        </Button>
        <Button onClick={handleNeueZeiterfassung} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Neue Zeiterfassung
        </Button>
      </div>

      {/* Statistiken */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesamt</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.gesamt.toFixed(1)}</div>
            <p className="text-xs text-gray-600 mt-1">Stunden gesamt</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Freigegeben</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.freigegeben.toFixed(1)}</div>
            <p className="text-xs text-gray-600 mt-1">Stunden freigegeben</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Offen</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.offen.toFixed(1)}</div>
            <p className="text-xs text-gray-600 mt-1">Stunden offen</p>
          </CardContent>
        </Card>
      </div>

      {/* Stunden pro Projekt */}
      {zeiterfassungen.length > 0 && (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Stunden pro Projekt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 hover:bg-gray-50">
                    <TableHead className="text-gray-900 font-semibold">Projekt</TableHead>
                    <TableHead className="text-gray-900 font-semibold text-right">Einträge</TableHead>
                    <TableHead className="text-gray-900 font-semibold text-right">Freigegeben</TableHead>
                    <TableHead className="text-gray-900 font-semibold text-right">Offen</TableHead>
                    <TableHead className="text-gray-900 font-semibold text-right">Gesamt</TableHead>
                    <TableHead className="text-gray-900 font-semibold text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projektStunden.map((projekt, idx) => (
                    <TableRow key={projekt.projektId || idx} className="border-gray-200 hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {projekt.projektId ? (
                          <Link 
                            href={`/dashboard/admin/projekte/${projekt.projektId}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {projekt.projektName}
                          </Link>
                        ) : (
                          <span className="text-gray-900">{projekt.projektName}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-700 text-right">
                        {projekt.eintraege}
                      </TableCell>
                      <TableCell className="text-green-600 font-semibold text-right">
                        {projekt.freigegebeneStunden.toFixed(1)} Std.
                      </TableCell>
                      <TableCell className="text-orange-600 font-semibold text-right">
                        {projekt.offeneStunden.toFixed(1)} Std.
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-blue-600 font-bold text-lg">
                            {projekt.gesamtStunden.toFixed(1)} Std.
                          </div>
                          {projekt.abgelehntStunden > 0 && (
                            <span className="text-xs text-red-600">✕ {projekt.abgelehntStunden.toFixed(1)} abgelehnt</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleProjektDetails(projekt.projektId)}
                          className="hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4 text-gray-700" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {projektStunden.length > 1 && (
                    <TableRow className="border-t-2 border-gray-300 bg-gray-50">
                      <TableCell className="font-bold text-gray-900">
                        Gesamt
                      </TableCell>
                      <TableCell className="text-gray-700 font-semibold text-right">
                        {zeiterfassungen.length}
                      </TableCell>
                      <TableCell className="text-green-600 font-bold text-right">
                        {stats.freigegeben.toFixed(1)} Std.
                      </TableCell>
                      <TableCell className="text-orange-600 font-bold text-right">
                        {stats.offen.toFixed(1)} Std.
                      </TableCell>
                      <TableCell className="text-blue-600 font-bold text-right text-lg">
                        {stats.gesamt.toFixed(1)} Std.
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zeiterfassungs-Tabelle */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Alle Zeiterfassungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {zeiterfassungen.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Keine Zeiterfassungen vorhanden</p>
            </div>
          ) : (
            <div className="rounded-md border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 hover:bg-gray-50">
                    <TableHead className="text-gray-900 font-semibold">Datum</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Projekt</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Quelle</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Typ</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Stunden</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Pause</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Von - Bis</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Beschreibung</TableHead>
                    <TableHead className="text-gray-900 font-semibold text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zeiterfassungen.map((zeit) => (
                    <TableRow key={zeit._id} className="border-gray-200 hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">
                        {format(new Date(zeit.datum), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {zeit.projektName || '-'}
                      </TableCell>
                      <TableCell>
                        {zeit.automatischErstellt ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                            📅 Plantafel
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600 text-xs">
                            Manuell
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${zeit.taetigkeitstyp === 'abbau' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                          <span className="text-sm">
                            {zeit.taetigkeitstyp === 'abbau' ? 'Abbau' : 'Aufbau'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {zeit.stunden} Std.
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {zeit.pause ? `${zeit.pause} Min.` : '-'}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {zeit.von && zeit.bis ? `${zeit.von} - ${zeit.bis}` : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(zeit.status)}
                      </TableCell>
                      <TableCell className="text-gray-700 max-w-xs truncate">
                        {zeit.beschreibung || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEintragBearbeiten(zeit)}
                            className="hover:bg-gray-100"
                            title="Bearbeiten"
                          >
                            <Edit2 className="h-4 w-4 text-gray-700" />
                          </Button>
                          {zeit.status !== 'freigegeben' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => zeit._id && handleEintragFreigeben(zeit._id)}
                              className="hover:bg-green-50"
                              title="Freigeben"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {zeit.status !== 'abgelehnt' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => zeit._id && handleEintragAblehnen(zeit._id)}
                              className="hover:bg-red-50"
                              title="Ablehnen"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEintragLoeschen(zeit)}
                            className="hover:bg-red-50"
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zeiterfassung Dialog */}
      <ZeiterfassungDialog
        open={dialogOpen}
        eintrag={editingEintrag}
        onClose={handleDialogClose}
        vorausgewaehlterMitarbeiter={{ id: mitarbeiterId, name: mitarbeiterName }}
      />

      {/* Projekt Details Dialog */}
      <Dialog open={projektDetailsOpen} onOpenChange={setProjektDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Zeiterfassungen für {projektStunden.find(p => p.projektId === selectedProjektId)?.projektName || 'Projekt'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="rounded-md border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 hover:bg-gray-50">
                    <TableHead className="text-gray-900 font-semibold">Datum</TableHead>
                    <TableHead className="text-gray-900 font-semibold text-right">Stunden</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Quelle</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Typ</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Von - Bis</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Pause</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Beschreibung</TableHead>
                    <TableHead className="text-gray-900 font-semibold text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zeiterfassungen
                    .filter(z => (selectedProjektId ? z.projektId === selectedProjektId : !z.projektId))
                    .map((eintrag) => (
                      <TableRow key={eintrag._id} className="border-gray-200 hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900">
                          {format(new Date(eintrag.datum), 'dd.MM.yyyy', { locale: de })}
                        </TableCell>
                        <TableCell className="font-bold text-gray-900 text-right">
                          {eintrag.stunden} Std.
                        </TableCell>
                        <TableCell>
                          {eintrag.automatischErstellt ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                              📅 Plantafel
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600 text-xs">
                              Manuell
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${eintrag.taetigkeitstyp === 'abbau' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                            <span className="text-sm">
                              {eintrag.taetigkeitstyp === 'abbau' ? 'Abbau' : 'Aufbau'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {eintrag.von && eintrag.bis ? `${eintrag.von} - ${eintrag.bis}` : '-'}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {eintrag.pause ? `${eintrag.pause} Min.` : '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(eintrag.status)}
                        </TableCell>
                        <TableCell className="text-gray-700 max-w-xs truncate">
                          {eintrag.beschreibung || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEintragBearbeiten(eintrag)}
                              className="hover:bg-gray-100"
                              title="Bearbeiten"
                            >
                              <Edit2 className="h-4 w-4 text-gray-700" />
                            </Button>
                            {eintrag.status !== 'freigegeben' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eintrag._id && handleEintragFreigeben(eintrag._id)}
                                className="hover:bg-green-50"
                                title="Freigeben"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {eintrag.status !== 'abgelehnt' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eintrag._id && handleEintragAblehnen(eintrag._id)}
                                className="hover:bg-red-50"
                                title="Ablehnen"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEintragLoeschen(eintrag)}
                              className="hover:bg-red-50"
                              title="Löschen"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Vorschau Dialog */}
      <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-xl font-bold text-gray-900">
                Stundenübersicht - {mitarbeiterName}
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePDFDownload}
                disabled={generatingPdf}
                className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
              >
                {generatingPdf ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Lade...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2 text-gray-700" />
                    Download
                  </>
                )}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 w-full overflow-hidden">
            <iframe
              src={`/api/mitarbeiter/${mitarbeiterId}/zeiterfassung-pdf`}
              className="w-full h-full border-0"
              title="PDF Vorschau"
              style={{ minHeight: 'calc(95vh - 80px)' }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Lösch-Dialog mit 2-facher Bestätigung */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogClose}>
        <AlertDialogContent className="bg-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">
              {deleteConfirmStep === 'first' ? 'Zeiteintrag löschen?' : '🚨 Endgültig löschen'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deleteConfirmStep === 'first' && eintragToDelete && (
                  <>
                    <p className="text-gray-700">
                      Möchten Sie diesen Zeiteintrag wirklich löschen?
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-700">
                          <strong>Datum:</strong> {format(new Date(eintragToDelete.datum), 'dd.MM.yyyy', { locale: de })}
                        </p>
                        <p className="text-gray-700">
                          <strong>Stunden:</strong> {eintragToDelete.stunden} Std.
                        </p>
                        <p className="text-gray-700">
                          <strong>Typ:</strong> {eintragToDelete.taetigkeitstyp === 'abbau' ? 'Abbau' : 'Aufbau'}
                        </p>
                        {eintragToDelete.projektName && (
                          <p className="text-gray-700">
                            <strong>Projekt:</strong> {eintragToDelete.projektName}
                          </p>
                        )}
                        {eintragToDelete.beschreibung && (
                          <p className="text-gray-700">
                            <strong>Beschreibung:</strong> {eintragToDelete.beschreibung}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Diese Aktion kann nicht rückgängig gemacht werden.
                    </p>
                  </>
                )}

                {deleteConfirmStep === 'second' && (
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
            {deleteConfirmStep === 'first' && (
              <>
                <AlertDialogCancel disabled={isDeleting} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Abbrechen
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Weiter
                </AlertDialogAction>
              </>
            )}

            {deleteConfirmStep === 'second' && (
              <>
                <AlertDialogCancel disabled={isDeleting} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Abbrechen
                </AlertDialogCancel>
                <Button
                  onClick={handleDeleteConfirm}
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

