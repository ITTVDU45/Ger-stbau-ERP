"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Urlaub } from '@/lib/db/types'
import { Calendar, AlertCircle, CheckCircle, Clock, XCircle, Plus, Edit2, Check, Trash2 } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'

interface MitarbeiterUrlaubProps {
  mitarbeiterId: string
  mitarbeiterName: string
}

export default function MitarbeiterUrlaub({ mitarbeiterId, mitarbeiterName }: MitarbeiterUrlaubProps) {
  const [urlaube, setUrlaube] = useState<Urlaub[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [urlaubZuLoeschen, setUrlaubZuLoeschen] = useState<string | null>(null)
  const [loescheUrlaub, setLoescheUrlaub] = useState(false)
  const [formData, setFormData] = useState({
    von: '',
    bis: '',
    typ: 'urlaub' as 'urlaub' | 'krankheit' | 'sonderurlaub' | 'unbezahlt' | 'sonstiges',
    grund: '',
    vertretung: ''
  })

  useEffect(() => {
    loadUrlaube()
  }, [mitarbeiterId])

  const loadUrlaube = async () => {
    try {
      setLoading(true)
      setApiError(false)
      const response = await fetch(`/api/urlaub?mitarbeiterId=${mitarbeiterId}`)
      
      if (response.status === 404) {
        // API existiert noch nicht
        setApiError(true)
        setUrlaube([])
      } else if (response.ok) {
        const data = await response.json()
        setUrlaube(data.urlaube || [])
      } else {
        setApiError(true)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Urlaube:', error)
      setApiError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleNeuerUrlaub = () => {
    setFormData({
      von: '',
      bis: '',
      typ: 'urlaub',
      grund: '',
      vertretung: ''
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.von || !formData.bis) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus')
      return
    }

    try {
      setSaving(true)
      const vonDate = new Date(formData.von)
      const bisDate = new Date(formData.bis)
      const anzahlTage = differenceInDays(bisDate, vonDate) + 1

      const response = await fetch('/api/urlaub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mitarbeiterId,
          mitarbeiterName,
          von: vonDate,
          bis: bisDate,
          anzahlTage,
          typ: formData.typ,
          status: 'beantragt',
          grund: formData.grund || undefined,
          vertretung: formData.vertretung || undefined,
          vertretungName: formData.vertretung || undefined
        })
      })

      if (response.ok) {
        toast.success('Urlaubsantrag erfolgreich erstellt')
        setDialogOpen(false)
        loadUrlaube()
      } else {
        const data = await response.json()
        toast.error(data.fehler || 'Fehler beim Erstellen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Erstellen')
    } finally {
      setSaving(false)
    }
  }

  const handleGenehmigen = async (urlaubId: string) => {
    try {
      const response = await fetch(`/api/urlaub/${urlaubId}/genehmigen`, {
        method: 'POST'
      })
      
      if (response.ok) {
        toast.success('Urlaubsantrag genehmigt')
        loadUrlaube()
      } else {
        const data = await response.json()
        toast.error(data.fehler || 'Fehler beim Genehmigen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Genehmigen')
    }
  }

  const handleAblehnen = async (urlaubId: string) => {
    const grund = prompt('Grund für Ablehnung (optional):')
    
    try {
      const response = await fetch(`/api/urlaub/${urlaubId}/ablehnen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grund })
      })
      
      if (response.ok) {
        toast.success('Urlaubsantrag abgelehnt')
        loadUrlaube()
      } else {
        const data = await response.json()
        toast.error(data.fehler || 'Fehler beim Ablehnen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Ablehnen')
    }
  }

  // Urlaubseintrag löschen - Dialog öffnen
  const handleLoeschen = (id: string) => {
    setUrlaubZuLoeschen(id)
  }

  // Urlaubseintrag tatsächlich löschen
  const bestaetigeLoeschen = async () => {
    if (!urlaubZuLoeschen) return

    setLoescheUrlaub(true)
    try {
      const response = await fetch(`/api/urlaub/${urlaubZuLoeschen}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Urlaubseintrag erfolgreich gelöscht')
        loadUrlaube()
      } else {
        toast.error('Fehler beim Löschen', {
          description: data.fehler || 'Unbekannter Fehler'
        })
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Urlaubseintrags:', error)
      toast.error('Fehler beim Löschen des Urlaubseintrags')
    } finally {
      setLoescheUrlaub(false)
      setUrlaubZuLoeschen(null)
    }
  }

  const getTypBadge = (typ: string) => {
    const variants: Record<string, { variant: any, label: string, class: string }> = {
      urlaub: { variant: 'default', label: 'Urlaub', class: 'bg-blue-600' },
      krankheit: { variant: 'default', label: 'Krankheit', class: 'bg-red-600' },
      sonderurlaub: { variant: 'default', label: 'Sonderurlaub', class: 'bg-purple-600' },
      unbezahlt: { variant: 'outline', label: 'Unbezahlt', class: 'border-gray-400' },
      sonstiges: { variant: 'secondary', label: 'Sonstiges', class: '' }
    }
    const config = variants[typ] || { variant: 'outline', label: typ, class: '' }
    return <Badge variant={config.variant} className={config.class}>{config.label}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, label: string, class: string }> = {
      beantragt: { variant: 'outline', label: 'Beantragt', class: 'border-orange-400 text-orange-700' },
      genehmigt: { variant: 'default', label: 'Genehmigt', class: 'bg-green-600' },
      abgelehnt: { variant: 'default', label: 'Abgelehnt', class: 'bg-red-600' }
    }
    const config = variants[status] || { variant: 'outline', label: status, class: '' }
    return <Badge variant={config.variant} className={config.class}>{config.label}</Badge>
  }

  // Berechne Statistiken
  const stats = {
    beantragt: urlaube.filter(u => u.status === 'beantragt').length,
    genehmigt: urlaube.filter(u => u.status === 'genehmigt').length,
    abgelehnt: urlaube.filter(u => u.status === 'abgelehnt').length
  }

  if (loading) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Lade Urlaubsdaten...</p>
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
            Urlaub & Abwesenheiten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">API noch nicht verfügbar</p>
            <p className="text-gray-500 text-sm">
              Die Urlaubs-API ist noch nicht implementiert.<br />
              Dieser Bereich wird aktiviert, sobald die API verfügbar ist.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Button */}
      <div className="flex justify-end">
        <Button onClick={handleNeuerUrlaub} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Neuer Urlaubsantrag
        </Button>
      </div>

      {/* Statistiken */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Beantragt</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.beantragt}</div>
            <p className="text-xs text-gray-600 mt-1">Anträge offen</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Genehmigt</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.genehmigt}</div>
            <p className="text-xs text-gray-600 mt-1">Genehmigte Anträge</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Abgelehnt</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.abgelehnt}</div>
            <p className="text-xs text-gray-600 mt-1">Abgelehnte Anträge</p>
          </CardContent>
        </Card>
      </div>

      {/* Urlaubs-Tabelle */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Urlaub & Abwesenheiten
          </CardTitle>
        </CardHeader>
        <CardContent>
          {urlaube.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Keine Urlaubseinträge vorhanden</p>
            </div>
          ) : (
            <div className="rounded-md border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 hover:bg-gray-50">
                    <TableHead className="text-gray-900 font-semibold">Von</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Bis</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Tage</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Typ</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Vertretung</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Grund</TableHead>
                    <TableHead className="text-gray-900 font-semibold text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urlaube.map((urlaub) => (
                    <TableRow key={urlaub._id} className="border-gray-200 hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">
                        {format(new Date(urlaub.von), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {format(new Date(urlaub.bis), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {urlaub.anzahlTage}
                      </TableCell>
                      <TableCell>
                        {getTypBadge(urlaub.typ)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(urlaub.status)}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {urlaub.vertretungName || '-'}
                      </TableCell>
                      <TableCell className="text-gray-700 max-w-xs truncate">
                        {urlaub.grund || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {urlaub.status !== 'genehmigt' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => urlaub._id && handleGenehmigen(urlaub._id)}
                              className="hover:bg-green-50"
                              title="Genehmigen"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {urlaub.status !== 'abgelehnt' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => urlaub._id && handleAblehnen(urlaub._id)}
                              className="hover:bg-red-50"
                              title="Ablehnen"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => urlaub._id && handleLoeschen(urlaub._id)}
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Neuer Urlaubsantrag</DialogTitle>
            <DialogDescription className="text-gray-600">
              Erstellen Sie einen Urlaubsantrag für {mitarbeiterName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="von" className="text-gray-900 font-medium">Von *</Label>
                <Input
                  id="von"
                  type="date"
                  value={formData.von}
                  onChange={(e) => setFormData(prev => ({ ...prev, von: e.target.value }))}
                  className="text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bis" className="text-gray-900 font-medium">Bis *</Label>
                <Input
                  id="bis"
                  type="date"
                  value={formData.bis}
                  onChange={(e) => setFormData(prev => ({ ...prev, bis: e.target.value }))}
                  className="text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="typ" className="text-gray-900 font-medium">Art</Label>
              <Select value={formData.typ} onValueChange={(value: any) => setFormData(prev => ({ ...prev, typ: value }))}>
                <SelectTrigger id="typ" className="text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urlaub">Urlaub</SelectItem>
                  <SelectItem value="krankheit">Krankheit</SelectItem>
                  <SelectItem value="sonderurlaub">Sonderurlaub</SelectItem>
                  <SelectItem value="unbezahlt">Unbezahlt</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vertretung" className="text-gray-900 font-medium">Vertretung (optional)</Label>
              <Input
                id="vertretung"
                type="text"
                placeholder="Name der Vertretung"
                value={formData.vertretung}
                onChange={(e) => setFormData(prev => ({ ...prev, vertretung: e.target.value }))}
                className="text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grund" className="text-gray-900 font-medium">Grund (optional)</Label>
              <Textarea
                id="grund"
                placeholder="Grund oder Anmerkungen..."
                value={formData.grund}
                onChange={(e) => setFormData(prev => ({ ...prev, grund: e.target.value }))}
                className="text-gray-900"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? 'Speichert...' : 'Antrag erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bestätigungs-Dialog für Urlaubseintrag löschen */}
      <AlertDialog open={urlaubZuLoeschen !== null} onOpenChange={(open) => !open && setUrlaubZuLoeschen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Urlaubseintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diesen Urlaubseintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loescheUrlaub}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={bestaetigeLoeschen}
              disabled={loescheUrlaub}
              className="bg-red-600 hover:bg-red-700"
            >
              {loescheUrlaub ? 'Lösche...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

