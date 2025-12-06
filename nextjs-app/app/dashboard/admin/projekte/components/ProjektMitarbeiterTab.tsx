"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Users, Eye, Edit2, Check, XCircle, Clock } from 'lucide-react'
import { Projekt, Zeiterfassung } from '@/lib/db/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import MitarbeiterZuweisenDialog from './MitarbeiterZuweisenDialog'
import ZeiterfassungDialog from '@/components/dialogs/ZeiterfassungDialog'

interface ProjektMitarbeiterTabProps {
  projekt: Projekt
  onProjektUpdated: () => void
}

export default function ProjektMitarbeiterTab({ projekt, onProjektUpdated }: ProjektMitarbeiterTabProps) {
  const [loading, setLoading] = useState(false)
  const [zeiterfassungen, setZeiterfassungen] = useState<Zeiterfassung[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mitarbeiterToDelete, setMitarbeiterToDelete] = useState<{ 
    id: string
    name: string
    index: number
    von?: Date
    bis?: Date
  } | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState({
    rolle: '',
    von: '',
    bis: '',
    stundenProTag: 8,
    stundenAufbau: 0,
    stundenAbbau: 0
  })
  const [stundenDetailsOpen, setStundenDetailsOpen] = useState(false)
  const [selectedMitarbeiterId, setSelectedMitarbeiterId] = useState<string | null>(null)
  const [editingZeiteintrag, setEditingZeiteintrag] = useState<Zeiterfassung | undefined>(undefined)
  const [zeiterfassungDialogOpen, setZeiterfassungDialogOpen] = useState(false)
  const [deleteZeiterfassungOpen, setDeleteZeiterfassungOpen] = useState(false)
  const [zeiterfassungToDelete, setZeiterfassungToDelete] = useState<{ id: string; datum: string; stunden: number } | null>(null)

  useEffect(() => {
    loadZeiterfassungen()
  }, [projekt._id, projekt.zugewieseneMitarbeiter])

  const loadZeiterfassungen = async () => {
    try {
      const response = await fetch(`/api/zeiterfassung?projektId=${projekt._id}`)
      if (response.ok) {
        const data = await response.json()
        setZeiterfassungen(data.zeiterfassungen || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Zeiterfassungen:', error)
    }
  }

  // Berechne erfasste Stunden pro Mitarbeiter für einen spezifischen Zeitraum
  const getErfassteStunden = (mitarbeiterId: string, von?: Date, bis?: Date) => {
    const vonDatum = von ? new Date(von) : null
    // Bei "Offen" (kein Bis): zähle nur den ersten Tag
    const bisDatum = bis ? new Date(bis) : (vonDatum ? new Date(vonDatum) : null)
    
    // Filtere Zeiterfassungen für diesen Mitarbeiter im angegebenen Zeitraum
    const mitarbeiterZeiten = zeiterfassungen.filter(z => {
      if (z.mitarbeiterId !== mitarbeiterId) return false
      
      const zeitDatum = new Date(z.datum)
      // Setze Zeit auf 00:00:00 für Vergleich
      zeitDatum.setHours(0, 0, 0, 0)
      
      if (vonDatum) {
        const vonVergleich = new Date(vonDatum)
        vonVergleich.setHours(0, 0, 0, 0)
        if (zeitDatum < vonVergleich) return false
      }
      
      if (bisDatum) {
        const bisVergleich = new Date(bisDatum)
        bisVergleich.setHours(0, 0, 0, 0)
        if (zeitDatum > bisVergleich) return false
      }
      
      return true
    })
    
    const freigegeben = mitarbeiterZeiten.filter(z => z.status === 'freigegeben').reduce((sum, z) => sum + z.stunden, 0)
    const offen = mitarbeiterZeiten.filter(z => z.status === 'offen').reduce((sum, z) => sum + z.stunden, 0)
    const abgelehnt = mitarbeiterZeiten.filter(z => z.status === 'abgelehnt').reduce((sum, z) => sum + z.stunden, 0)
    const gesamt = freigegeben + offen + abgelehnt
    
    // Berechne Aufteilung nach Aufbau/Abbau
    const aufbau = mitarbeiterZeiten
      .filter(z => z.taetigkeitstyp === 'aufbau' || !z.taetigkeitstyp)
      .reduce((sum, z) => sum + z.stunden, 0)
    const abbau = mitarbeiterZeiten
      .filter(z => z.taetigkeitstyp === 'abbau')
      .reduce((sum, z) => sum + z.stunden, 0)
    
    return { gesamt, freigegeben, offen, abgelehnt, eintraege: mitarbeiterZeiten.length, aufbau, abbau }
  }

  const handleMitarbeiterBearbeitenClick = (index: number) => {
    const mitarbeiter = projekt.zugewieseneMitarbeiter?.[index]
    if (!mitarbeiter) return
    
    setEditingIndex(index)
    
    // Berechne aktuelle Stunden für Aufbau/Abbau aus Zeiterfassungen
    const stundenInfo = getErfassteStunden(mitarbeiter.mitarbeiterId, mitarbeiter.von, mitarbeiter.bis)
    
    setEditFormData({
      rolle: mitarbeiter.rolle || 'monteur',
      von: mitarbeiter.von ? new Date(mitarbeiter.von).toISOString().split('T')[0] : '',
      bis: mitarbeiter.bis ? new Date(mitarbeiter.bis).toISOString().split('T')[0] : '',
      stundenProTag: mitarbeiter.stundenProTag || 8,
      stundenAufbau: (mitarbeiter as any).stundenAufbau || stundenInfo.aufbau || 0,
      stundenAbbau: (mitarbeiter as any).stundenAbbau || stundenInfo.abbau || 0
    })
    setEditDialogOpen(true)
  }

  const handleMitarbeiterBearbeiten = async () => {
    if (editingIndex === null) return

    try {
      setLoading(true)
      const updatedMitarbeiter = [...(projekt.zugewieseneMitarbeiter || [])]
      updatedMitarbeiter[editingIndex] = {
        ...updatedMitarbeiter[editingIndex],
        rolle: editFormData.rolle,
        von: editFormData.von ? new Date(editFormData.von) : undefined,
        bis: editFormData.bis ? new Date(editFormData.bis) : undefined,
        stundenProTag: editFormData.stundenProTag,
        stundenAufbau: editFormData.stundenAufbau,
        stundenAbbau: editFormData.stundenAbbau
      } as any
      
      const response = await fetch(`/api/projekte/${projekt._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projekt,
          zugewieseneMitarbeiter: updatedMitarbeiter
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren')
      }

      toast.success('Mitarbeiter-Zuweisung erfolgreich aktualisiert')
      setEditDialogOpen(false)
      setEditingIndex(null)
      
      // Automatische Neuberechnung der Vorkalkulation nach Mitarbeiter-Bearbeitung
      // (z.B. Stundenänderung könnte Auswirkungen haben)
      try {
        const autoBerechnenResponse = await fetch(`/api/kalkulation/${projekt._id}/auto-berechnen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (autoBerechnenResponse.ok) {
          console.log('✓ Vorkalkulation automatisch neu berechnet nach Mitarbeiter-Bearbeitung')
        }
      } catch (error) {
        console.warn('Konnte Vorkalkulation nicht automatisch neu berechnen:', error)
      }
      
      onProjektUpdated()
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Aktualisieren')
    } finally {
      setLoading(false)
    }
  }

  const handleStundenDetails = (mitarbeiterId: string) => {
    setSelectedMitarbeiterId(mitarbeiterId)
    setStundenDetailsOpen(true)
  }

  const handleZeiterfassungBearbeiten = (eintrag: Zeiterfassung) => {
    setEditingZeiteintrag(eintrag)
    setZeiterfassungDialogOpen(true)
    setStundenDetailsOpen(false)
  }

  const handleZeiterfassungDialogClose = (updated: boolean) => {
    setZeiterfassungDialogOpen(false)
    setEditingZeiteintrag(undefined)
    if (updated) {
      loadZeiterfassungen()
      onProjektUpdated()
    }
  }

  const handleZeiterfassungFreigeben = async (eintragId: string) => {
    try {
      const response = await fetch(`/api/zeiterfassung/${eintragId}/freigeben`, {
        method: 'POST'
      })
      
      if (response.ok) {
        toast.success('Zeiteintrag erfolgreich freigegeben')
        await loadZeiterfassungen()
        onProjektUpdated()
      } else {
        const data = await response.json()
        toast.error(data.fehler || 'Fehler beim Freigeben')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Freigeben')
    }
  }

  const handleZeiterfassungAblehnen = async (eintragId: string) => {
    try {
      const response = await fetch(`/api/zeiterfassung/${eintragId}/ablehnen`, {
        method: 'POST'
      })
      
      if (response.ok) {
        toast.success('Zeiteintrag abgelehnt')
        await loadZeiterfassungen()
        onProjektUpdated()
      } else {
        const data = await response.json()
        toast.error(data.fehler || 'Fehler beim Ablehnen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Ablehnen')
    }
  }

  const handleZeiterfassungLoeschenClick = (eintrag: Zeiterfassung) => {
    if (!eintrag._id) return
    setZeiterfassungToDelete({ 
      id: eintrag._id, 
      datum: format(new Date(eintrag.datum), 'dd.MM.yyyy', { locale: de }),
      stunden: eintrag.stunden 
    })
    setDeleteZeiterfassungOpen(true)
  }

  const handleZeiterfassungLoeschen = async () => {
    if (!zeiterfassungToDelete) return

    try {
      const response = await fetch(`/api/zeiterfassung/${zeiterfassungToDelete.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Zeiteintrag erfolgreich gelöscht')
        setDeleteZeiterfassungOpen(false)
        setZeiterfassungToDelete(null)
        await loadZeiterfassungen()
        onProjektUpdated()
      } else {
        const data = await response.json()
        toast.error(data.fehler || 'Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Löschen')
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

  const handleMitarbeiterEntfernenClick = (index: number) => {
    const mitarbeiter = projekt.zugewieseneMitarbeiter?.[index]
    if (!mitarbeiter) return
    
    setMitarbeiterToDelete({ 
      id: mitarbeiter.mitarbeiterId, 
      name: mitarbeiter.mitarbeiterName,
      index: index,
      von: mitarbeiter.von,
      bis: mitarbeiter.bis
    })
    setDeleteDialogOpen(true)
  }

  const handleMitarbeiterEntfernen = async () => {
    if (!mitarbeiterToDelete) return

    try {
      setLoading(true)
      
      // 1. Entferne diese spezifische Zuweisung aus dem Array
      const updatedMitarbeiter = (projekt.zugewieseneMitarbeiter || []).filter(
        (_, idx) => idx !== mitarbeiterToDelete.index
      )
      
      // 2. Update Projekt
      const response = await fetch(`/api/projekte/${projekt._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projekt,
          zugewieseneMitarbeiter: updatedMitarbeiter
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Entfernen des Mitarbeiters')
      }

      // 3. Lösche zugehörige Zeiterfassungen für diesen Zeitraum
      const vonDatum = mitarbeiterToDelete.von ? new Date(mitarbeiterToDelete.von) : null
      const bisDatum = mitarbeiterToDelete.bis ? new Date(mitarbeiterToDelete.bis) : new Date()
      
      // Finde Zeiterfassungen für diesen Mitarbeiter im Zeitraum
      const zuLoeschendeZeiterfassungen = zeiterfassungen.filter(z => 
        z.mitarbeiterId === mitarbeiterToDelete.id &&
        z.projektId === projekt._id &&
        (vonDatum ? new Date(z.datum) >= vonDatum : true) &&
        (bisDatum ? new Date(z.datum) <= bisDatum : true)
      )

      // Lösche jede Zeiterfassung
      for (const zeiterfassung of zuLoeschendeZeiterfassungen) {
        if (zeiterfassung._id) {
          await fetch(`/api/zeiterfassung/${zeiterfassung._id}`, {
            method: 'DELETE'
          })
        }
      }

      toast.success(`Mitarbeiter entfernt und ${zuLoeschendeZeiterfassungen.length} Zeiterfassungen gelöscht`)
      setDeleteDialogOpen(false)
      setMitarbeiterToDelete(null)
      await loadZeiterfassungen()
      
      // Automatische Neuberechnung der Vorkalkulation nach Mitarbeiter-Entfernung
      try {
        const autoBerechnenResponse = await fetch(`/api/kalkulation/${projekt._id}/auto-berechnen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (autoBerechnenResponse.ok) {
          console.log('✓ Vorkalkulation automatisch neu berechnet nach Mitarbeiter-Entfernung')
        }
      } catch (error) {
        console.warn('Konnte Vorkalkulation nicht automatisch neu berechnen:', error)
      }
      
      onProjektUpdated()
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Entfernen des Mitarbeiters')
    } finally {
      setLoading(false)
    }
  }

  const getRolleBadge = (rolle: string) => {
    const rolleConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
      kolonnenfuehrer: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Kolonnenführer' },
      vorarbeiter: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'Vorarbeiter' },
      monteur: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Monteur' },
      helfer: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: 'Helfer' },
      // Legacy-Unterstützung
      bauleiter: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Bauleiter' },
    }
    const config = rolleConfig[rolle] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: rolle }
    return (
      <Badge variant="outline" className={`${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </Badge>
    )
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-gray-900">Zugewiesene Mitarbeiter</CardTitle>
            <CardDescription className="text-gray-600">
              Verwalten Sie die Mitarbeiter-Zuteilung für dieses Projekt
            </CardDescription>
          </div>
          <MitarbeiterZuweisenDialog projekt={projekt} onSuccess={onProjektUpdated}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Mitarbeiter zuweisen
            </Button>
          </MitarbeiterZuweisenDialog>
        </div>
      </CardHeader>
      <CardContent>
        {!projekt.zugewieseneMitarbeiter || projekt.zugewieseneMitarbeiter.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Noch keine Mitarbeiter zugewiesen</p>
            <MitarbeiterZuweisenDialog projekt={projekt} onSuccess={onProjektUpdated}>
              <Button variant="outline" className="border-gray-300 text-gray-700">
                <Plus className="h-4 w-4 mr-2" />
                Ersten Mitarbeiter zuweisen
              </Button>
            </MitarbeiterZuweisenDialog>
          </div>
        ) : (
          <div className="rounded-md border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-900">Name</TableHead>
                  <TableHead className="text-gray-900">Rolle</TableHead>
                  <TableHead className="text-gray-900">Von</TableHead>
                  <TableHead className="text-gray-900">Bis</TableHead>
                  <TableHead className="text-gray-900 text-right">Erfasste Stunden</TableHead>
                  <TableHead className="text-gray-900">Aufbau/Abbau</TableHead>
                  <TableHead className="text-right text-gray-900">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projekt.zugewieseneMitarbeiter.map((mitarbeiter, index) => {
                  const stundenInfo = getErfassteStunden(mitarbeiter.mitarbeiterId, mitarbeiter.von, mitarbeiter.bis)
                  
                  // Verwende manuell gesetzte Werte aus der Mitarbeiter-Zuweisung, falls vorhanden
                  const aufbauStunden = (mitarbeiter as any).stundenAufbau !== undefined && (mitarbeiter as any).stundenAufbau !== null
                    ? (mitarbeiter as any).stundenAufbau
                    : stundenInfo.aufbau
                  const abbauStunden = (mitarbeiter as any).stundenAbbau !== undefined && (mitarbeiter as any).stundenAbbau !== null
                    ? (mitarbeiter as any).stundenAbbau
                    : stundenInfo.abbau
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-gray-900">
                        {mitarbeiter.mitarbeiterName}
                      </TableCell>
                      <TableCell>
                        {getRolleBadge(mitarbeiter.rolle)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {mitarbeiter.von && mitarbeiter.von !== 'Invalid Date'
                          ? format(new Date(mitarbeiter.von), 'dd.MM.yyyy', { locale: de })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {mitarbeiter.bis && mitarbeiter.bis !== 'Invalid Date'
                          ? format(new Date(mitarbeiter.bis), 'dd.MM.yyyy', { locale: de })
                          : 'Offen'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div 
                          className="flex flex-col items-end gap-1 cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                          onClick={() => handleStundenDetails(mitarbeiter.mitarbeiterId)}
                          title="Klicken für Details"
                        >
                          <div className="font-bold text-blue-600 text-base">
                            {stundenInfo.gesamt.toFixed(1)} Std.
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="text-green-600" title="Freigegeben">✓ {stundenInfo.freigegeben.toFixed(1)}</span>
                            <span className="text-orange-600" title="Offen">○ {stundenInfo.offen.toFixed(1)}</span>
                            {stundenInfo.abgelehnt > 0 && (
                              <span className="text-red-600" title="Abgelehnt">✕ {stundenInfo.abgelehnt.toFixed(1)}</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">({stundenInfo.eintraege} Einträge)</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {aufbauStunden > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-sm text-gray-700">
                                Aufbau: {aufbauStunden.toFixed(1)}h
                                {(mitarbeiter as any).stundenAufbau !== undefined && (mitarbeiter as any).stundenAufbau !== null && (
                                  <span className="ml-1 text-xs text-blue-600" title="Manuell korrigiert">*</span>
                                )}
                              </span>
                            </div>
                          )}
                          {abbauStunden > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-sm text-gray-700">
                                Abbau: {abbauStunden.toFixed(1)}h
                                {(mitarbeiter as any).stundenAbbau !== undefined && (mitarbeiter as any).stundenAbbau !== null && (
                                  <span className="ml-1 text-xs text-green-600" title="Manuell korrigiert">*</span>
                                )}
                              </span>
                            </div>
                          )}
                          {aufbauStunden === 0 && abbauStunden === 0 && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="hover:bg-gray-100"
                            title="Mitarbeiter-Details anzeigen"
                          >
                            <Link href={`/dashboard/admin/mitarbeiter/${mitarbeiter.mitarbeiterId}`}>
                              <Eye className="h-4 w-4 text-gray-700" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMitarbeiterBearbeitenClick(index)}
                            disabled={loading}
                            className="hover:bg-gray-100"
                            title="Zuweisung bearbeiten"
                          >
                            <Edit2 className="h-4 w-4 text-gray-700" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMitarbeiterEntfernenClick(index)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Von Projekt entfernen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Zusammenfassung */}
        {projekt.zugewieseneMitarbeiter && projekt.zugewieseneMitarbeiter.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm text-blue-700 mb-1">Gesamt</div>
                <div className="text-2xl font-bold text-blue-900">
                  {projekt.zugewieseneMitarbeiter.length}
                </div>
                <div className="text-xs text-blue-600 mt-1">Mitarbeiter</div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="text-sm text-purple-700 mb-1">Kolonnenführer</div>
                <div className="text-2xl font-bold text-purple-900">
                  {projekt.zugewieseneMitarbeiter.filter(m => m.rolle === 'kolonnenfuehrer').length}
                </div>
                <div className="text-xs text-purple-600 mt-1">Zugewiesen</div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="text-sm text-orange-700 mb-1">Vorarbeiter</div>
                <div className="text-2xl font-bold text-orange-900">
                  {projekt.zugewieseneMitarbeiter.filter(m => m.rolle === 'vorarbeiter').length}
                </div>
                <div className="text-xs text-orange-600 mt-1">Zugewiesen</div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="text-sm text-green-700 mb-1">Monteure</div>
                <div className="text-2xl font-bold text-green-900">
                  {projekt.zugewieseneMitarbeiter.filter(m => m.rolle === 'monteur').length}
                </div>
                <div className="text-xs text-green-600 mt-1">Zugewiesen</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <div className="text-sm text-gray-700 mb-1">Helfer</div>
                <div className="text-2xl font-bold text-gray-900">
                  {projekt.zugewieseneMitarbeiter.filter(m => m.rolle === 'helfer').length}
                </div>
                <div className="text-xs text-gray-600 mt-1">Zugewiesen</div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>

      {/* Bearbeitungs-Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Mitarbeiter-Zuweisung bearbeiten</DialogTitle>
            <DialogDescription className="text-gray-600">
              Passen Sie die Zuweisung von {editingIndex !== null && projekt.zugewieseneMitarbeiter?.[editingIndex]?.mitarbeiterName} an
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-rolle">Rolle</Label>
                <Select
                  value={editFormData.rolle}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, rolle: value }))}
                >
                  <SelectTrigger id="edit-rolle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kolonnenfuehrer">Kolonnenführer</SelectItem>
                    <SelectItem value="vorarbeiter">Vorarbeiter</SelectItem>
                    <SelectItem value="monteur">Monteur</SelectItem>
                    <SelectItem value="helfer">Helfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-stunden">Stunden/Tag</Label>
                <Input
                  id="edit-stunden"
                  type="number"
                  min="1"
                  max="12"
                  value={editFormData.stundenProTag}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, stundenProTag: parseInt(e.target.value) || 8 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-von">Von</Label>
                <Input
                  id="edit-von"
                  type="date"
                  value={editFormData.von}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, von: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bis">Bis (optional)</Label>
                <Input
                  id="edit-bis"
                  type="date"
                  value={editFormData.bis}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, bis: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
              <div className="space-y-2">
                <Label htmlFor="edit-stunden-aufbau" className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Stunden Aufbau
                </Label>
                <Input
                  id="edit-stunden-aufbau"
                  type="number"
                  min="0"
                  step="0.1"
                  value={editFormData.stundenAufbau}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, stundenAufbau: parseFloat(e.target.value) || 0 }))}
                  className="text-gray-900"
                />
                <p className="text-xs text-gray-500">Korrektur für Aufbau-Stunden</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-stunden-abbau" className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Stunden Abbau
                </Label>
                <Input
                  id="edit-stunden-abbau"
                  type="number"
                  min="0"
                  step="0.1"
                  value={editFormData.stundenAbbau}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, stundenAbbau: parseFloat(e.target.value) || 0 }))}
                  className="text-gray-900"
                />
                <p className="text-xs text-gray-500">Korrektur für Abbau-Stunden</p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setEditingIndex(null)
              }}
              disabled={loading}
              className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleMitarbeiterBearbeiten}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Speichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stunden-Details-Dialog */}
      <Dialog open={stundenDetailsOpen} onOpenChange={setStundenDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Zeiterfassungen - {projekt.zugewieseneMitarbeiter?.find(m => m.mitarbeiterId === selectedMitarbeiterId)?.mitarbeiterName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="rounded-md border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 hover:bg-gray-50">
                    <TableHead className="text-gray-900 font-semibold">Datum</TableHead>
                    <TableHead className="text-gray-900 font-semibold text-right">Stunden</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Von - Bis</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Pause</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Beschreibung</TableHead>
                    <TableHead className="text-gray-900 font-semibold text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zeiterfassungen
                    .filter(z => z.mitarbeiterId === selectedMitarbeiterId)
                    .map((eintrag) => (
                      <TableRow key={eintrag._id} className="border-gray-200 hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900">
                          {format(new Date(eintrag.datum), 'dd.MM.yyyy', { locale: de })}
                        </TableCell>
                        <TableCell className="font-bold text-gray-900 text-right">
                          {eintrag.stunden} Std.
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
                              onClick={() => handleZeiterfassungBearbeiten(eintrag)}
                              className="hover:bg-gray-100"
                              title="Bearbeiten"
                            >
                              <Edit2 className="h-4 w-4 text-gray-700" />
                            </Button>
                            {eintrag.status !== 'freigegeben' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eintrag._id && handleZeiterfassungFreigeben(eintrag._id)}
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
                                onClick={() => eintrag._id && handleZeiterfassungAblehnen(eintrag._id)}
                                className="hover:bg-red-50"
                                title="Ablehnen"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleZeiterfassungLoeschenClick(eintrag)}
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

      {/* Zeiterfassung Bearbeiten Dialog */}
      <ZeiterfassungDialog
        open={zeiterfassungDialogOpen}
        eintrag={editingZeiteintrag}
        onClose={handleZeiterfassungDialogClose}
      />

      {/* Zeiterfassung Löschen Dialog */}
      <Dialog open={deleteZeiterfassungOpen} onOpenChange={setDeleteZeiterfassungOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Zeiteintrag löschen</DialogTitle>
            <DialogDescription className="text-gray-600">
              Möchten Sie diesen Zeiteintrag wirklich dauerhaft löschen?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Datum:</span> {zeiterfassungToDelete?.datum}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-semibold">Stunden:</span> {zeiterfassungToDelete?.stunden} Std.
            </p>
            <p className="text-xs text-red-600 mt-3 font-medium">
              ⚠️ Diese Aktion kann nicht rückgängig gemacht werden!
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteZeiterfassungOpen(false)
                setZeiterfassungToDelete(null)
              }}
              disabled={loading}
              className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleZeiterfassungLoeschen}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Wird gelöscht...' : 'Löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mitarbeiter Entfernen Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Mitarbeiter entfernen</DialogTitle>
            <DialogDescription className="text-gray-600">
              Möchten Sie diesen Mitarbeiter wirklich vom Projekt entfernen?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Mitarbeiter:</span> {mitarbeiterToDelete?.name}
            </p>
            {mitarbeiterToDelete?.von && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Zeitraum:</span>{' '}
                {format(new Date(mitarbeiterToDelete.von), 'dd.MM.yyyy', { locale: de })}
                {mitarbeiterToDelete.bis && ` - ${format(new Date(mitarbeiterToDelete.bis), 'dd.MM.yyyy', { locale: de })}`}
              </p>
            )}
            <p className="text-xs text-red-600 mt-3 font-medium">
              ⚠️ Alle Zeiterfassungen für diesen Zeitraum werden ebenfalls gelöscht!
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setMitarbeiterToDelete(null)
              }}
              disabled={loading}
              className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleMitarbeiterEntfernen}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Wird entfernt...' : 'Entfernen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}


