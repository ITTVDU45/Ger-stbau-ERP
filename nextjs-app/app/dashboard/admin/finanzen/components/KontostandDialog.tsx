'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, TrendingDown, History, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface KontostandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mandantId?: string | null
  onSuccess?: () => void
}

export default function KontostandDialog({ open, onOpenChange, mandantId, onSuccess }: KontostandDialogProps) {
  const [loading, setLoading] = useState(false)
  const [historieLoading, setHistorieLoading] = useState(false)
  const [historie, setHistorie] = useState<any[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [snapshotToDelete, setSnapshotToDelete] = useState<any>(null)
  const [formData, setFormData] = useState({
    betrag: '',
    datum: new Date().toISOString().split('T')[0],
    notiz: ''
  })

  useEffect(() => {
    if (open) {
      loadHistorie()
    }
  }, [open, mandantId])

  const loadHistorie = async () => {
    try {
      setHistorieLoading(true)
      const params = new URLSearchParams()
      if (mandantId) params.append('mandantId', mandantId)

      const res = await fetch(`/api/finanzen/kontostand?${params}`)
      const data = await res.json()

      if (data.erfolg) {
        setHistorie(data.historie || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Historie:', error)
    } finally {
      setHistorieLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.betrag) {
      toast.error('Bitte Betrag eingeben')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/finanzen/kontostand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mandantId,
          betrag: parseFloat(formData.betrag),
          datum: formData.datum,
          notiz: formData.notiz,
          typ: 'manuell',
          erstelltVon: 'user' // TODO: aus Session holen
        })
      })

      const data = await res.json()

      if (res.ok && data.erfolg) {
        toast.success('Kontostand aktualisiert')
        onSuccess?.()
        onOpenChange(false)
        resetForm()
        loadHistorie()
      } else {
        toast.error(data.fehler || 'Fehler beim Aktualisieren')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Aktualisieren des Kontostands')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      betrag: '',
      datum: new Date().toISOString().split('T')[0],
      notiz: ''
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const getAenderung = (index: number) => {
    if (index >= historie.length - 1) return null
    const aktuell = historie[index].betrag
    const vorher = historie[index + 1].betrag
    return aktuell - vorher
  }

  const handleDeleteClick = (snapshot: any) => {
    setSnapshotToDelete(snapshot)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!snapshotToDelete?._id) return

    try {
      const res = await fetch(`/api/finanzen/kontostand/${snapshotToDelete._id}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (res.ok && data.erfolg) {
        toast.success('Kontostand-Eintrag gelöscht')
        loadHistorie()
        onSuccess?.()
      } else {
        toast.error(data.fehler || 'Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      toast.error('Fehler beim Löschen des Eintrags')
    } finally {
      setDeleteDialogOpen(false)
      setSnapshotToDelete(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kontostand anpassen</DialogTitle>
          <DialogDescription>
            Erfassen Sie einen neuen Kontostand-Snapshot. Die Historie wird automatisch gespeichert.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Eingabe-Formular */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Neuer Kontostand
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="betrag">Betrag (€) *</Label>
                <Input
                  id="betrag"
                  type="number"
                  step="0.01"
                  value={formData.betrag}
                  onChange={(e) => setFormData(prev => ({ ...prev, betrag: e.target.value }))}
                  placeholder="z.B. 10000.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="datum">Datum *</Label>
                <Input
                  id="datum"
                  type="date"
                  value={formData.datum}
                  onChange={(e) => setFormData(prev => ({ ...prev, datum: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notiz">Notiz (optional)</Label>
              <Textarea
                id="notiz"
                value={formData.notiz}
                onChange={(e) => setFormData(prev => ({ ...prev, notiz: e.target.value }))}
                placeholder="z.B. Anfangsstand, Korrektur, etc."
                rows={2}
              />
            </div>
          </div>

          {/* Historie */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <History className="h-4 w-4" />
              Kontostand-Historie
              {historie.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {historie.length} {historie.length === 1 ? 'Eintrag' : 'Einträge'}
                </Badge>
              )}
            </h3>

            {historieLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">Historie wird geladen...</p>
              </div>
            ) : historie.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">Noch keine Historie vorhanden</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0">
                    <TableRow>
                      <TableHead className="text-gray-900 font-semibold">Datum</TableHead>
                      <TableHead className="text-gray-900 font-semibold text-right">Betrag</TableHead>
                      <TableHead className="text-gray-900 font-semibold text-right">Änderung</TableHead>
                      <TableHead className="text-gray-900 font-semibold">Notiz</TableHead>
                      <TableHead className="text-gray-900 font-semibold">Typ</TableHead>
                      <TableHead className="text-gray-900 font-semibold w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historie.map((snapshot, index) => {
                      const aenderung = getAenderung(index)
                      return (
                        <TableRow key={snapshot._id}>
                          <TableCell className="text-gray-900 font-medium">
                            {format(new Date(snapshot.datum), 'dd.MM.yyyy', { locale: de })}
                          </TableCell>
                          <TableCell className="text-right text-gray-900 font-semibold">
                            {formatCurrency(snapshot.betrag)}
                          </TableCell>
                          <TableCell className="text-right">
                            {aenderung !== null ? (
                              <span className={`flex items-center justify-end gap-1 font-medium ${aenderung >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {aenderung >= 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {formatCurrency(Math.abs(aenderung))}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-700 text-sm max-w-xs truncate">
                            {snapshot.notiz || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={snapshot.typ === 'manuell' ? 'default' : 'secondary'}>
                              {snapshot.typ === 'manuell' ? '📝 Manuell' : '🤖 Auto'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(snapshot)}
                              title="Eintrag löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kontostand speichern
            </Button>
          </DialogFooter>
        </form>

        {/* Lösch-Bestätigungs-Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kontostand-Eintrag löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Sind Sie sicher, dass Sie diesen Kontostand-Eintrag löschen möchten?
                {snapshotToDelete && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-1 text-sm">
                      <div><strong>Datum:</strong> {snapshotToDelete.datum ? format(new Date(snapshotToDelete.datum), 'dd.MM.yyyy', { locale: de }) : '-'}</div>
                      <div><strong>Betrag:</strong> {formatCurrency(snapshotToDelete.betrag)}</div>
                      {snapshotToDelete.notiz && <div><strong>Notiz:</strong> {snapshotToDelete.notiz}</div>}
                      <div><strong>Typ:</strong> {snapshotToDelete.typ === 'manuell' ? 'Manuell' : 'Automatisch'}</div>
                    </div>
                  </div>
                )}
                <p className="mt-3 text-red-600 font-medium">
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteDialogOpen(false)
                setSnapshotToDelete(null)
              }}>
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}

