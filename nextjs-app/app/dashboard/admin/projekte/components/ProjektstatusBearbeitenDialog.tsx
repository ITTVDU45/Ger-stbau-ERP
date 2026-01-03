'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Projekt } from '@/lib/db/types'
import { toast } from 'sonner'

interface ProjektstatusBearbeitenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projekt: Projekt
  onSuccess: () => void
}

export default function ProjektstatusBearbeitenDialog({
  open,
  onOpenChange,
  projekt,
  onSuccess
}: ProjektstatusBearbeitenDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    status: 'in_planung' as Projekt['status'],
    startdatum: '',
    enddatum: '',
    bauleiter: '',
    notizen: ''
  })

  useEffect(() => {
    if (open) {
      setFormData({
        status: projekt.status || 'in_planung',
        startdatum: projekt.startdatum ? new Date(projekt.startdatum).toISOString().split('T')[0] : '',
        enddatum: projekt.enddatum ? new Date(projekt.enddatum).toISOString().split('T')[0] : '',
        bauleiter: projekt.bauleiter || projekt.verantwortlicher || '',
        notizen: projekt.notizen || ''
      })
    }
  }, [open, projekt])

  const handleSpeichern = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projekte/${projekt._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: formData.status,
          startdatum: formData.startdatum || null,
          enddatum: formData.enddatum || null,
          bauleiter: formData.bauleiter,
          verantwortlicher: formData.bauleiter, // Sync beide Felder
          notizen: formData.notizen,
          geaendertVon: 'admin'
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Projektstatus & Termine erfolgreich aktualisiert')
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(data.fehler || 'Fehler beim Aktualisieren')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Aktualisieren')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Projektstatus & Termine bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="space-y-2">
            <Label className="text-gray-900">Projektstatus</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({ ...formData, status: value as Projekt['status'] })}
            >
              <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_planung">In Planung</SelectItem>
                <SelectItem value="aktiv">Aktiv</SelectItem>
                <SelectItem value="in_abrechnung">In Abrechnung</SelectItem>
                <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                <SelectItem value="pausiert">Pausiert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Termine */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-900">Startdatum</Label>
              <Input
                type="date"
                value={formData.startdatum}
                onChange={(e) => setFormData({ ...formData, startdatum: e.target.value })}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900">Enddatum</Label>
              <Input
                type="date"
                value={formData.enddatum}
                onChange={(e) => setFormData({ ...formData, enddatum: e.target.value })}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>

          {/* Bauleiter */}
          <div className="space-y-2">
            <Label className="text-gray-900">Verantwortlicher / Bauleiter</Label>
            <Input
              value={formData.bauleiter}
              onChange={(e) => setFormData({ ...formData, bauleiter: e.target.value })}
              placeholder="Name des Bauleiters"
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>

          {/* Notizen */}
          <div className="space-y-2">
            <Label className="text-gray-900">Notizen</Label>
            <Textarea
              value={formData.notizen}
              onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
              placeholder="Projektnotizen..."
              className="bg-white border-gray-300 text-gray-900"
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSpeichern}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Speichert...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

